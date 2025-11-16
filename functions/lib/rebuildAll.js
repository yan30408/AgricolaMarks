const {
  rateMatch,
  createInitialState,
  conservativeRating,
  RATING_STATE_VERSION
} = require("./trueskill");

const MODE_KEYS = ["classic", "classicMoor", "revised", "revisedMoor"];
const DEFAULT_GAME_MODE = "classic";
const GAME_MODE_ALIASES = {
  classic: "classic",
  classics: "classic",
  "classic-base": "classic",
  "classic base": "classic",
  "classic-moor": "classicMoor",
  classic_moor: "classicMoor",
  classicmoor: "classicMoor",
  "classic moor": "classicMoor",
  "classic+moor": "classicMoor",
  revised: "revised",
  "revised-base": "revised",
  "revised base": "revised",
  "revised-moor": "revisedMoor",
  revised_moor: "revisedMoor",
  revisedmoor: "revisedMoor",
  "revised moor": "revisedMoor",
  "revised+moor": "revisedMoor"
};

function normalizeGameMode(value) {
  if (!value) {
    return DEFAULT_GAME_MODE;
  }
  const raw = String(value).trim();
  if (!raw) {
    return DEFAULT_GAME_MODE;
  }
  if (MODE_KEYS.includes(raw)) {
    return raw;
  }
  const key = raw.toLowerCase();
  return GAME_MODE_ALIASES[key] || DEFAULT_GAME_MODE;
}

function toMillis(date) {
  if (!date) {
    return 0;
  }
  if (typeof date.toMillis === "function") {
    return date.toMillis();
  }
  if (date && typeof date === "object" && date.seconds !== undefined) {
    return date.seconds * 1000 + (date.nanoseconds || 0) / 1e6;
  }
  return Number(date) || 0;
}

function calculateRanks(players) {
  const sorted = [...players].sort((a, b) => {
    const aScore = a?.score?.total || 0;
    const bScore = b?.score?.total || 0;
    return bScore - aScore;
  });

  const rankMap = new Map();
  let currentRank = 1;
  let previousScore = null;

  sorted.forEach((player, index) => {
    const score = player?.score?.total || 0;
    if (previousScore !== null && score < previousScore) {
      currentRank = index + 1;
    }
    if (player?.uid) {
      rankMap.set(player.uid, currentRank);
    }
    previousScore = score;
  });

  return rankMap;
}

function buildEntries(resultId, snapshot) {
  const players = Array.isArray(snapshot.results)
    ? snapshot.results
    : Array.isArray(snapshot.players)
    ? snapshot.players
    : [];
  const participantCount = players.length;
  const matchDate = snapshot.playedAt || snapshot.date || null;
  const gameMode = normalizeGameMode(snapshot.gameMode);

  const rankMap = calculateRanks(players);

  return players
    .filter(player => player && player.uid)
    .map((player, index) => ({
      resultId,
      uid: player.uid,
      rank: rankMap.get(player.uid) || index + 1,
      order: Number.isInteger(player.order) ? player.order : null,
      score: player.score?.total || 0,
      color: player.color || null,
      playedAt: matchDate,
      participantCount,
      gameMode
    }));
}

function emptyRankCounts() {
  return {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0
  };
}

function emptyOrderHistogram() {
  const histogram = {};
  for (let order = 0; order < 5; order += 1) {
    histogram[String(order)] = {
      plays: 0,
      wins: 0,
      rankCounts: emptyRankCounts()
    };
  }
  histogram.unknown = {
    plays: 0,
    wins: 0,
    rankCounts: emptyRankCounts()
  };
  return histogram;
}

function normalizeRank(rank) {
  const value = Number(rank);
  if (!Number.isFinite(value) || value <= 0) {
    return "5";
  }
  if (value > 5) {
    return "5";
  }
  return String(Math.round(value));
}

function normalizeOrder(order) {
  if (Number.isInteger(order) && order >= 0 && order < 5) {
    return String(order);
  }
  return "unknown";
}

function sanitizeOrderHistogram(histogram) {
  Object.entries(histogram).forEach(([key, value]) => {
    value.plays = Math.max(0, value.plays || 0);
    value.wins = Math.max(0, value.wins || 0);
    const rankCounts = value.rankCounts || emptyRankCounts();
    Object.keys(rankCounts).forEach(rank => {
      rankCounts[rank] = Math.max(0, rankCounts[rank] || 0);
    });
    value.rankCounts = rankCounts;
    histogram[key] = value;
  });
}

function determineFavoriteColor(colorCounts = {}) {
  let favorite = null;
  let favoriteCount = -1;
  Object.entries(colorCounts).forEach(([color, count]) => {
    if (count > favoriteCount) {
      favorite = color;
      favoriteCount = count;
    }
  });
  return favorite;
}

function sanitizeColorCounts(colorCounts = {}) {
  const sanitized = {};
  Object.entries(colorCounts).forEach(([color, value]) => {
    const numeric = Math.round(Number(value) || 0);
    if (numeric > 0) {
      sanitized[color] = numeric;
    }
  });
  return sanitized;
}

function ensureMap(target, key, factory) {
  if (!target.has(key)) {
    target.set(key, factory());
  }
  return target.get(key);
}

async function commitOperations(db, operations) {
  if (!operations.length) {
    return;
  }
  let batch = db.batch();
  let writes = 0;
  for (const operation of operations) {
    if (operation.type === "set") {
      batch.set(operation.ref, operation.data, { merge: true });
    } else if (operation.type === "update") {
      batch.update(operation.ref, operation.data);
    } else if (operation.type === "delete") {
      batch.delete(operation.ref);
    } else {
      throw new Error(`Unknown operation type: ${operation.type}`);
    }
    writes += 1;
    if (writes >= 400) {
      await batch.commit();
      batch = db.batch();
      writes = 0;
    }
  }
  if (writes > 0) {
    await batch.commit();
  }
}

async function rebuildAllRatings({
  db,
  FieldValue,
  logger = console,
  logRatings = false
}) {
  const log = logger || console;
  log.info("Rebuilding ratings: fetching results...");

  const resultsSnapshot = await db.collection("results").get();
  const results = resultsSnapshot.docs.map(doc => ({
    id: doc.id,
    data: doc.data() || {}
  }));

  results.sort((a, b) => {
    const aMillis = toMillis(a.data.playedAt || a.data.date);
    const bMillis = toMillis(b.data.playedAt || b.data.date);
    if (aMillis !== bMillis) {
      return aMillis - bMillis;
    }
    return a.id.localeCompare(b.id);
  });

  const ratingStates = new Map();
  const statsByUser = new Map();
  const aggregatesByUser = new Map();
  const globalStats = {
    matchCount: 0,
    orderHistogram: emptyOrderHistogram()
  };
  const debugRatings = [];

  const resultUpdates = [];

  results.forEach(({ id: resultId, data }) => {
    const entries = buildEntries(resultId, data);
    const mode = normalizeGameMode(data.gameMode);
    if (!entries.length) {
      resultUpdates.push({
        ref: db.collection("results").doc(resultId),
        players: [],
        signature: `${mode}|0|`
      });
      return;
    }

    entries.forEach(entry => {
      const userStates = ensureMap(ratingStates, entry.uid, () => new Map());
      if (!userStates.has(entry.gameMode)) {
        userStates.set(entry.gameMode, createInitialState());
      }
    });

    const stateLookup = new Map();
    entries.forEach(entry => {
      const state =
        ratingStates.get(entry.uid).get(entry.gameMode) || createInitialState();
      stateLookup.set(entry.uid, state);
    });

    let outcomes = new Map();
    let newStates = null;
    if (entries.length >= 2) {
      try {
        ({ outcomes, newStates } = rateMatch(entries, stateLookup));
      } catch (error) {
        if (logger.error) {
          logger.error("TrueSkill rateMatch failed during rebuild", {
            resultId,
            mode,
            entryCount: entries.length,
            participants: entries.map(entry => ({
              uid: entry.uid,
              rank: entry.rank,
              order: entry.order,
              score: entry.score,
              participantCount: entry.participantCount
            })),
            error: error?.message || String(error)
          });
        }
        throw error;
      }
    } else if (logger.info) {
      logger.info("Skipping TrueSkill update (requires >= 2 participants)", {
        resultId,
        mode,
        entryCount: entries.length
      });
    }

    if (entries.length >= 2 && newStates) {
      entries.forEach(entry => {
        const userStates = ratingStates.get(entry.uid);
        const nextState = newStates.get(entry.uid);
        userStates.set(entry.gameMode, {
          version: RATING_STATE_VERSION,
          mu: nextState.mu,
          sigma: nextState.sigma,
          lastResultId: resultId,
          lastPlayedAt: entry.playedAt || null,
          historyVersion: 1
        });
      });
    }

    const sourcePlayers = Array.isArray(data.results)
      ? data.results
      : Array.isArray(data.players)
      ? data.players
      : [];

    const updatedPlayers = sourcePlayers.map(player => {
      if (!player || typeof player !== "object" || !player.uid) {
        return player;
      }
      const outcome = outcomes.get(player.uid);
      const sanitized = { ...player };
      delete sanitized.ratingBefore;
      delete sanitized.ratingAfter;
      delete sanitized.ratingVersion;
      if (outcome) {
        sanitized.ratingBefore = outcome.ratingBefore;
        sanitized.ratingAfter = outcome.ratingAfter;
        sanitized.ratingVersion = RATING_STATE_VERSION;
      }
      return sanitized;
    });

    resultUpdates.push({
      ref: db.collection("results").doc(resultId),
      players: updatedPlayers,
      signature: `${mode}|${entries.length}|${entries
        .map(entry => `${entry.uid}:${entry.rank}`)
        .sort()
        .join(",")}`
    });

    entries.forEach(entry => {
      const statsMap = ensureMap(statsByUser, entry.uid, () => new Map());
      statsMap.set(entry.resultId, {
        gameMode: entry.gameMode,
        playedAt: entry.playedAt || null,
        order: entry.order,
        participantCount: entry.participantCount,
        rank: entry.rank,
        color: entry.color || null,
        totalScore: entry.score
      });

      const aggregate = ensureMap(aggregatesByUser, entry.uid, () => ({
        modes: new Map(),
        colorCounts: {}
      }));
      const modeAggregate = ensureMap(aggregate.modes, entry.gameMode, () => ({
        playCount: 0,
        scoreTotal: 0,
        highestScore: null,
        lowestScore: null,
        lastPlayedAt: null,
        lastResultId: null,
        ratingSigma: null
      }));

      const playedAt = entry.playedAt || null;
      const millis = toMillis(playedAt);

      modeAggregate.playCount += 1;
      modeAggregate.scoreTotal += entry.score;

      if (
        !modeAggregate.highestScore ||
        entry.score > modeAggregate.highestScore.score ||
        (entry.score === modeAggregate.highestScore.score &&
          millis > toMillis(modeAggregate.highestScore.playedAt))
      ) {
        modeAggregate.highestScore = {
          resultId: entry.resultId,
          score: entry.score,
          playedAt
        };
      }

      if (
        !modeAggregate.lowestScore ||
        entry.score < modeAggregate.lowestScore.score ||
        (entry.score === modeAggregate.lowestScore.score &&
          millis < toMillis(modeAggregate.lowestScore.playedAt))
      ) {
        modeAggregate.lowestScore = {
          resultId: entry.resultId,
          score: entry.score,
          playedAt
        };
      }

      if (
        !modeAggregate.lastPlayedAt ||
        millis >= toMillis(modeAggregate.lastPlayedAt)
      ) {
        modeAggregate.lastPlayedAt = playedAt;
        modeAggregate.lastResultId = entry.resultId;
      }

      if (entry.color) {
        aggregate.colorCounts[entry.color] =
          (aggregate.colorCounts[entry.color] || 0) + 1;
      }
    });

    const relevant = entries.filter(
      entry =>
        normalizeGameMode(entry.gameMode) === DEFAULT_GAME_MODE &&
        Number(entry.participantCount) === 5
    );
    if (relevant.length) {
      globalStats.matchCount += 1;
      relevant.forEach(entry => {
        const orderKey = normalizeOrder(entry.order);
        const bucket = globalStats.orderHistogram[orderKey] || {
          plays: 0,
          wins: 0,
          rankCounts: emptyRankCounts()
        };
        bucket.plays += 1;
        if (entry.rank === 1) {
          bucket.wins += 1;
        }
        const rankKey = normalizeRank(entry.rank);
        bucket.rankCounts[rankKey] = (bucket.rankCounts[rankKey] || 0) + 1;
        globalStats.orderHistogram[orderKey] = bucket;
      });
    }
  });

  log.info("Applying result updates...");
  await commitOperations(
    db,
    resultUpdates.map(update => ({
      type: "update",
      ref: update.ref,
      data: {
        results: update.players,
        ratingMeta: {
          version: RATING_STATE_VERSION,
          signature: update.signature,
          status: "applied",
          updatedAt: FieldValue.serverTimestamp()
        }
      }
    }))
  );

  log.info("Updating per-user stats and summaries...");

  for (const [uid, statsMap] of statsByUser.entries()) {
    const userRef = db.collection("users").doc(uid);
    let userName = uid;
    try {
      const userSnapshot = await userRef.get();
      if (userSnapshot.exists) {
        const userData = userSnapshot.data() || {};
        userName =
          userData.displayName ||
          userData.name ||
          userData.nickname ||
          userData.fullName ||
          userName;
      }
    } catch (error) {
      if (log.warn) {
        log.warn(
          `Failed to fetch user profile for ${uid}: ${error?.message || error}`
        );
      }
    }

    const statsCollection = userRef.collection("stats");
    const ratingStatesCollection = userRef.collection("ratingStates");

    const desiredStatIds = new Set(statsMap.keys());
    const existingStats = await statsCollection.listDocuments();
    const statOperations = [];

    existingStats.forEach(docRef => {
      if (!desiredStatIds.has(docRef.id)) {
        statOperations.push({ type: "delete", ref: docRef });
      }
    });

    statsMap.forEach((value, resultId) => {
      statOperations.push({
        type: "set",
        ref: statsCollection.doc(resultId),
        data: {
          ...value,
          updatedAt: FieldValue.serverTimestamp()
        }
      });
    });

    await commitOperations(db, statOperations);

    const desiredRatingModes = new Set(
      (ratingStates.get(uid) || new Map()).keys()
    );
    const existingRatingDocs = await ratingStatesCollection.listDocuments();
    const ratingOperations = [];

    existingRatingDocs.forEach(docRef => {
      if (!desiredRatingModes.has(docRef.id)) {
        ratingOperations.push({ type: "delete", ref: docRef });
      }
    });

    const userStates = ratingStates.get(uid) || new Map();
    userStates.forEach((state, mode) => {
      ratingOperations.push({
        type: "set",
        ref: ratingStatesCollection.doc(mode),
        data: {
          version: RATING_STATE_VERSION,
          mu: state.mu,
          sigma: state.sigma,
          lastResultId: state.lastResultId || null,
          lastPlayedAt: state.lastPlayedAt || null,
          historyVersion: Number.isFinite(state.historyVersion)
            ? state.historyVersion
            : 1,
          updatedAt: FieldValue.serverTimestamp()
        }
      });
      if (
        logRatings &&
        state &&
        Number.isFinite(state.mu) &&
        Number.isFinite(state.sigma)
      ) {
        debugRatings.push({
          mode,
          uid,
          name: userName,
          mu: state.mu,
          sigma: state.sigma,
          expose: conservativeRating(state.mu, state.sigma)
        });
      }
    });

    await commitOperations(db, ratingOperations);

    const aggregates = aggregatesByUser.get(uid);
    if (!aggregates) {
      continue;
    }

    const modesPayload = {};
    aggregates.modes.forEach((value, mode) => {
      const state = userStates.get(mode);
      const rating =
        state && Number.isFinite(state.mu) && Number.isFinite(state.sigma)
          ? conservativeRating(state.mu, state.sigma)
          : null;
      modesPayload[mode] = {
        playCount: Math.max(0, Math.round(value.playCount || 0)),
        scoreTotal: Number(value.scoreTotal) || 0,
        highestScore: value.highestScore || null,
        lowestScore: value.lowestScore || null,
        rating,
        sigma:
          state && Number.isFinite(state.sigma)
            ? state.sigma
            : Number.isFinite(value.ratingSigma)
            ? value.ratingSigma
            : null,
        lastPlayedAt: value.lastPlayedAt || null,
        lastResultId: value.lastResultId || null,
        updatedAt: FieldValue.serverTimestamp()
      };
    });

    const sanitizedColorCounts = sanitizeColorCounts(aggregates.colorCounts);
    const favoriteColor = determineFavoriteColor(sanitizedColorCounts) || null;

    const summaryRef = userRef.collection("statsSummary").doc("modes");
    await summaryRef.set(
      {
        modes: modesPayload,
        colorCounts: sanitizedColorCounts,
        favoriteColor,
        type: "summary",
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }

  sanitizeOrderHistogram(globalStats.orderHistogram);
  log.info("Updating global stats...");

  if (logRatings && debugRatings.length) {
    const modes = new Map();
    debugRatings.forEach(entry => {
      if (!modes.has(entry.mode)) {
        modes.set(entry.mode, []);
      }
      modes.get(entry.mode).push(entry);
    });

    modes.forEach((entries, mode) => {
      const sorted = entries.sort((a, b) => b.expose - a.expose);
      log.info(`TrueSkill standings for mode: ${mode}`);
      sorted.forEach(data => {
        log.info(
          `rate=${data.expose.toFixed(3)} (μ=${data.mu.toFixed(
            2
          )}, σ=${data.sigma.toFixed(2)}) : ${data.name}`
        );
      });
    });
  }

  await db.doc("stats/global").set(
    {
      matchCount: globalStats.matchCount,
      orderHistogram: globalStats.orderHistogram,
      type: "summary",
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  log.info("Rebuild completed.");
}

module.exports = {
  rebuildAllRatings
};
