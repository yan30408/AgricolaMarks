const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

if (!admin.apps.length) {
  admin.initializeApp();
}

const REGION = "asia-northeast1";
const db = admin.firestore();

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

function createEmptyModeSummary() {
  return {
    playCount: 0,
    scoreTotal: 0,
    highestScore: null,
    lowestScore: null,
    rating: null,
    lastRatingPlayedAt: null,
    lastRatingResultId: null,
    updatedAt: null
  };
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

function toMillis(date) {
  if (!date) {
    return 0;
  }
  if (typeof date.toMillis === "function") {
    return date.toMillis();
  }
  if (date.seconds !== undefined) {
    return date.seconds * 1000 + (date.nanoseconds || 0) / 1e6;
  }
  return Number(date) || 0;
}

// TODO: Add emulator-based tests covering add/update/delete paths before deployment.

exports.onResultWrite = functions
  .region(REGION)
  .firestore.document("results/{resultId}")
  .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    const resultId = context.params.resultId;

    if (!before && !after) {
      return null;
    }

    const beforeEntries = before ? buildEntries(resultId, before) : [];
    const afterEntries = after ? buildEntries(resultId, after) : [];

    if (beforeEntries.length) {
      await applyUserChanges(beforeEntries, "remove");
    }
    if (afterEntries.length) {
      await applyUserChanges(afterEntries, "add");
    }

    const isCreate = !before && !!after;
    const isDelete = !!before && !after;

    if (beforeEntries.length || isDelete) {
      await applyGlobalChange(beforeEntries, "remove", isDelete);
    }
    if (afterEntries.length || isCreate) {
      await applyGlobalChange(afterEntries, "add", isCreate);
    }

    return null;
  });

exports.mergeUserAccounts = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    const sourceUid = data?.sourceUid;
    const targetUid = data?.targetUid;

    if (!sourceUid || typeof sourceUid !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "sourceUid must be provided."
      );
    }

    if (!targetUid || typeof targetUid !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "targetUid must be provided."
      );
    }

    const authHeader =
      context.rawRequest?.headers?.authorization ||
      context.rawRequest?.headers?.Authorization ||
      "";

    const isEmulator =
      process.env.FUNCTIONS_EMULATOR === "true" ||
      process.env.FUNCTIONS_EMULATOR_HOST !== undefined;
    const isEmulatorAdminCall = isEmulator && authHeader === "Bearer owner";
    const isServiceAccountCall =
      authHeader.startsWith("Bearer ") &&
      (!context.auth ||
        context.auth.token?.firebase?.sign_in_provider === "google.com");

    if (!context.auth && !isEmulatorAdminCall && !isServiceAccountCall) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required."
      );
    }

    const requesterUid = context.auth?.uid || null;
    const hasAdminClaim = context.auth?.token?.admin === true;
    const isAdmin =
      hasAdminClaim || isEmulatorAdminCall || isServiceAccountCall;

    if (!isAdmin && targetUid !== requesterUid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You can only merge into your own account."
      );
    }

    if (sourceUid === targetUid) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "sourceUid and targetUid must be different."
      );
    }

    const sourceRef = db.collection("users").doc(sourceUid);
    const targetRef = db.collection("users").doc(targetUid);

    const [sourceSnap, targetSnap] = await Promise.all([
      sourceRef.get(),
      targetRef.get()
    ]);

    if (!sourceSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Source user does not exist."
      );
    }

    if (!targetSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Target user does not exist."
      );
    }

    const statsDocRefs = await sourceRef.collection("stats").listDocuments();
    const statsSummaryDocRefs = await sourceRef
      .collection("statsSummary")
      .listDocuments();
    const resultIds = statsDocRefs
      .map(ref => ref.id)
      .filter(id => id !== "summary");

    let mergedCount = 0;
    for (const resultId of resultIds) {
      const status = await mergeResultDocument(resultId, sourceUid, targetUid);
      if (status === true) {
        mergedCount += 1;
      }
    }

    const deletions = [];
    if (statsDocRefs.length > 0) {
      deletions.push(deleteDocumentRefs(statsDocRefs));
    }
    if (statsSummaryDocRefs.length > 0) {
      deletions.push(deleteDocumentRefs(statsSummaryDocRefs));
    }
    if (deletions.length) {
      await Promise.all(deletions);
    }

    await sourceRef.delete();
    const targetUpdate = {
      updatedAt: FieldValue.serverTimestamp()
    };

    await targetRef.set(targetUpdate, { merge: true });

    functions.logger.info("mergeUserAccounts completed", {
      sourceUid,
      targetUid,
      mergedCount
    });

    return { mergedCount };
  });

function buildEntries(resultId, snapshot) {
  const players = Array.isArray(snapshot.results)
    ? snapshot.results
    : Array.isArray(snapshot.players)
    ? snapshot.players
    : [];
  const participantCount = players.length;
  const matchDate = snapshot.playedAt || snapshot.date || null;
  const gameMode = normalizeGameMode(snapshot.gameMode);

  warnIfPlayersOutOfOrder(resultId, players);

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
      date: matchDate,
      playedAt: matchDate,
      participantCount,
      gameMode,
      ratingBefore: toFiniteNumber(player.ratingBefore),
      ratingAfter: toFiniteNumber(player.ratingAfter)
    }));
}

function warnIfPlayersOutOfOrder(resultId, players) {
  for (let index = 1; index < players.length; index += 1) {
    const previous = players[index - 1];
    const current = players[index];
    const previousScore = previous?.score?.total;
    const currentScore = current?.score?.total;
    if (
      typeof previousScore === "number" &&
      typeof currentScore === "number" &&
      currentScore > previousScore
    ) {
      functions.logger.warn("Players array is not sorted by rank", {
        resultId,
        previousUid: previous?.uid,
        previousScore,
        currentUid: current?.uid,
        currentScore
      });
      break;
    }
  }
}

function toFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function mergeResultDocument(resultId, sourceUid, targetUid) {
  const resultRef = db.collection("results").doc(resultId);
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(resultRef);
    if (!snapshot.exists) {
      return "missing";
    }

    const data = snapshot.data() || {};
    const players = Array.isArray(data.results) ? data.results : [];
    let changed = false;

    const updatedPlayers = players.map(player => {
      const normalized = {
        ...player,
        ratingBefore: toFiniteNumber(player?.ratingBefore),
        ratingAfter: toFiniteNumber(player?.ratingAfter)
      };
      if (player?.uid === sourceUid) {
        changed = true;
        return {
          ...normalized,
          uid: targetUid
        };
      }
      return normalized;
    });

    if (!changed) {
      return false;
    }

    tx.update(resultRef, {
      results: updatedPlayers,
      updatedAt: FieldValue.serverTimestamp()
    });
    return true;
  });
}

async function deleteDocumentRefs(docRefs) {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < docRefs.length; i += CHUNK_SIZE) {
    const batch = db.batch();
    docRefs.slice(i, i + CHUNK_SIZE).forEach(ref => {
      batch.delete(ref);
    });
    await batch.commit();
  }
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
    rankMap.set(player.uid, currentRank);
    previousScore = score;
  });

  return rankMap;
}

async function applyUserChanges(entries, operation) {
  if (!entries.length) {
    return;
  }

  const entriesByUser = new Map();
  entries.forEach(rawEntry => {
    if (!rawEntry?.uid) {
      return;
    }
    const entry = {
      ...rawEntry,
      gameMode: normalizeGameMode(rawEntry.gameMode)
    };
    if (!entriesByUser.has(entry.uid)) {
      entriesByUser.set(entry.uid, []);
    }
    entriesByUser.get(entry.uid).push(entry);
  });

  for (const [uid, userEntries] of entriesByUser.entries()) {
    let batch = db.batch();
    let writesInBatch = 0;

    for (const entry of userEntries) {
      const statsRef = db.doc(`users/${uid}/stats/${entry.resultId}`);
      if (operation === "add") {
        batch.set(
          statsRef,
          {
            gameMode: entry.gameMode,
            playedAt: entry.playedAt || entry.date || null,
            order: entry.order,
            participantCount:
              Number.isFinite(entry.participantCount) &&
              entry.participantCount > 0
                ? entry.participantCount
                : userEntries.length,
            rank: entry.rank,
            color: entry.color || null,
            totalScore: entry.score,
            ratingBefore: entry.ratingBefore,
            ratingAfter: entry.ratingAfter,
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );
      } else {
        batch.delete(statsRef);
      }

      writesInBatch += 1;
      if (writesInBatch >= 400) {
        await batch.commit();
        batch = db.batch();
        writesInBatch = 0;
      }
    }

    if (writesInBatch > 0) {
      await batch.commit();
    }

    await updateUserModeSummaryForUser(uid, userEntries, operation);
  }
}

async function updateUserModeSummaryForUser(uid, entries, operation) {
  if (!uid || !entries.length) {
    return;
  }

  const summaryRef = db.doc(`users/${uid}/statsSummary/modes`);
  const snapshot = await summaryRef.get();
  const existing = snapshot.exists ? snapshot.data() : {};
  const currentModes =
    existing && typeof existing === "object" && existing.modes
      ? { ...existing.modes }
      : {};
  let colorCounts =
    existing && typeof existing.colorCounts === "object"
      ? sanitizeColorCounts(existing.colorCounts)
      : {};
  let favoriteColor =
    typeof existing.favoriteColor === "string" ? existing.favoriteColor : null;

  const perMode = new Map();
  entries.forEach(entry => {
    const mode = normalizeGameMode(entry.gameMode);
    if (!perMode.has(mode)) {
      perMode.set(mode, []);
    }
    perMode.get(mode).push(entry);

    if (entry.color) {
      if (operation === "add") {
        colorCounts[entry.color] = (colorCounts[entry.color] || 0) + 1;
      } else if (operation === "remove") {
        if (colorCounts[entry.color]) {
          colorCounts[entry.color] -= 1;
          if (colorCounts[entry.color] <= 0) {
            delete colorCounts[entry.color];
          }
        }
      }
    }
  });

  for (const [mode, modeEntries] of perMode.entries()) {
    let summary = cloneModeSummary(currentModes[mode]);

    if (operation === "add") {
      summary = applyModeAdditions(summary, modeEntries);
    } else if (operation === "remove") {
      summary = await applyModeRemovals(uid, mode, summary, modeEntries);
    }

    if (!summary || summary.playCount <= 0) {
      delete currentModes[mode];
      continue;
    }

    const sanitized = sanitizeModeSummary(summary);
    sanitized.updatedAt = FieldValue.serverTimestamp();
    currentModes[mode] = sanitized;
  }

  colorCounts = sanitizeColorCounts(colorCounts);
  favoriteColor = determineFavoriteColor(colorCounts) || null;

  if (Object.keys(currentModes).length === 0) {
    if (snapshot.exists && Object.keys(colorCounts).length === 0) {
      await summaryRef.delete();
    }
    return;
  }

  await summaryRef.set(
    {
      modes: currentModes,
      colorCounts,
      favoriteColor,
      type: "summary",
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

function cloneModeSummary(source) {
  const base = createEmptyModeSummary();
  if (!source || typeof source !== "object") {
    return base;
  }

  base.playCount = Number.isFinite(source.playCount) ? source.playCount : 0;
  base.scoreTotal = Number.isFinite(source.scoreTotal) ? source.scoreTotal : 0;
  base.highestScore = cloneScoreReference(source.highestScore);
  base.lowestScore = cloneScoreReference(source.lowestScore);
  base.rating =
    typeof source.rating === "number" && Number.isFinite(source.rating)
      ? source.rating
      : null;
  base.lastRatingPlayedAt = source.lastRatingPlayedAt || null;
  base.lastRatingResultId = source.lastRatingResultId || null;
  base.updatedAt = source.updatedAt || null;
  return base;
}

function cloneScoreReference(ref) {
  if (!ref || typeof ref !== "object") {
    return null;
  }
  return {
    resultId: ref.resultId || null,
    score: Number.isFinite(ref.score) ? ref.score : 0,
    playedAt: ref.playedAt || null
  };
}

function applyModeAdditions(summary, entries) {
  const updated = cloneModeSummary(summary);

  entries.forEach(entry => {
    const score = Number.isFinite(entry.score) ? entry.score : 0;
    const playedAt = entry.playedAt || entry.date || null;

    updated.playCount += 1;
    updated.scoreTotal += score;

    if (
      !updated.highestScore ||
      score > updated.highestScore.score ||
      (score === updated.highestScore.score &&
        toMillis(playedAt) > toMillis(updated.highestScore.playedAt))
    ) {
      updated.highestScore = {
        resultId: entry.resultId,
        score,
        playedAt
      };
    }

    if (
      !updated.lowestScore ||
      score < updated.lowestScore.score ||
      (score === updated.lowestScore.score &&
        toMillis(playedAt) < toMillis(updated.lowestScore.playedAt))
    ) {
      updated.lowestScore = {
        resultId: entry.resultId,
        score,
        playedAt
      };
    }

    if (
      entry.ratingAfter !== null &&
      entry.ratingAfter !== undefined &&
      Number.isFinite(entry.ratingAfter)
    ) {
      const entryMillis = toMillis(playedAt);
      const storedMillis = toMillis(updated.lastRatingPlayedAt);
      if (updated.lastRatingPlayedAt === null || entryMillis >= storedMillis) {
        updated.rating = entry.ratingAfter;
        updated.lastRatingPlayedAt = playedAt;
        updated.lastRatingResultId = entry.resultId;
      }
    }
  });

  return updated;
}

async function applyModeRemovals(uid, mode, summary, entries) {
  const updated = cloneModeSummary(summary);

  let highestAffected = false;
  let lowestAffected = false;
  let ratingAffected = false;

  entries.forEach(entry => {
    const score = Number.isFinite(entry.score) ? entry.score : 0;
    updated.playCount -= 1;
    updated.scoreTotal -= score;

    if (updated.highestScore?.resultId === entry.resultId) {
      highestAffected = true;
    }
    if (updated.lowestScore?.resultId === entry.resultId) {
      lowestAffected = true;
    }
    if (updated.lastRatingResultId === entry.resultId) {
      ratingAffected = true;
    }
  });

  if (updated.playCount <= 0) {
    return createEmptyModeSummary();
  }

  if (highestAffected) {
    updated.highestScore = await fetchExtremeScore(uid, mode, "desc");
  }
  if (lowestAffected) {
    updated.lowestScore = await fetchExtremeScore(uid, mode, "asc");
  }
  if (ratingAffected) {
    const latestRating = await fetchLatestRating(uid, mode);
    if (latestRating) {
      updated.rating = latestRating.rating;
      updated.lastRatingPlayedAt = latestRating.playedAt || null;
      updated.lastRatingResultId = latestRating.resultId || null;
    } else {
      updated.rating = null;
      updated.lastRatingPlayedAt = null;
      updated.lastRatingResultId = null;
    }
  }

  return updated;
}

function sanitizeModeSummary(summary) {
  const sanitized = cloneModeSummary(summary);
  sanitized.playCount = Math.max(0, Math.round(sanitized.playCount || 0));
  if (!sanitized.highestScore) {
    sanitized.highestScore = null;
  }
  if (!sanitized.lowestScore) {
    sanitized.lowestScore = null;
  }
  if (sanitized.rating !== null && !Number.isFinite(sanitized.rating)) {
    sanitized.rating = null;
  }
  return sanitized;
}

async function fetchExtremeScore(uid, mode, direction) {
  const statsRef = db
    .collection("users")
    .doc(uid)
    .collection("stats");
  const orderDirection = direction === "asc" ? "asc" : "desc";
  const snapshot = await statsRef
    .where("gameMode", "==", mode)
    .orderBy("totalScore", orderDirection)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data() || {};
  return {
    resultId: doc.id,
    score: Number.isFinite(data.totalScore) ? data.totalScore : 0,
    playedAt: data.playedAt || null
  };
}

async function fetchLatestRating(uid, mode) {
  const statsRef = db
    .collection("users")
    .doc(uid)
    .collection("stats");
  const snapshot = await statsRef
    .where("gameMode", "==", mode)
    .orderBy("playedAt", "desc")
    .limit(20)
    .get();

  if (snapshot.empty) {
    return null;
  }

  let fallback = null;
  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (
      data.ratingAfter !== undefined &&
      data.ratingAfter !== null &&
      Number.isFinite(data.ratingAfter)
    ) {
      return {
        rating: data.ratingAfter,
        playedAt: data.playedAt || null,
        resultId: doc.id
      };
    }
    if (
      fallback === null &&
      data.ratingBefore !== undefined &&
      data.ratingBefore !== null &&
      Number.isFinite(data.ratingBefore)
    ) {
      fallback = {
        rating: data.ratingBefore,
        playedAt: data.playedAt || null,
        resultId: doc.id
      };
    }
  }

  return fallback;
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

async function applyGlobalChange(entries, operation, adjustMatchCount) {
  const relevantEntries = (entries || []).filter(entry => {
    return (
      normalizeGameMode(entry.gameMode) === DEFAULT_GAME_MODE &&
      Number(entry.participantCount) === 5
    );
  });

  if (!relevantEntries.length) {
    return;
  }

  const docRef = db.doc("stats/global");
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(docRef);
    const existing = snapshot.exists
      ? snapshot.data()
      : createEmptyGlobalStats();
    const delta = operation === "add" ? 1 : -1;

    const orderHistogram = existing.orderHistogram || emptyOrderHistogram();

    let matchCount = existing.matchCount || 0;
    if (adjustMatchCount && relevantEntries.length) {
      matchCount += delta;
    }
    matchCount = Math.max(matchCount, 0);

    existing.matchCount = matchCount;

    relevantEntries.forEach(entry => {
      const orderKey = normalizeOrder(entry.order);
      const orderBucket = orderHistogram[orderKey] || {
        plays: 0,
        wins: 0,
        rankCounts: emptyRankCounts()
      };
      orderBucket.plays += delta;
      if (entry.rank === 1) {
        orderBucket.wins += delta;
      }
      const rankCounts = orderBucket.rankCounts || emptyRankCounts();
      const rankKey = normalizeRank(entry.rank);
      rankCounts[rankKey] = (rankCounts[rankKey] || 0) + delta;
      orderBucket.rankCounts = rankCounts;
      orderHistogram[orderKey] = orderBucket;
    });

    sanitizeOrderHistogram(orderHistogram);

    tx.set(docRef, {
      matchCount,
      orderHistogram,
      type: "summary",
      updatedAt: FieldValue.serverTimestamp()
    });
  });
}

function createEmptyGlobalStats() {
  return {
    matchCount: 0,
    orderHistogram: emptyOrderHistogram()
  };
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
