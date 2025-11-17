/* eslint-disable no-console */
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const {
  loadEnv,
  initializeFirebaseApp,
  ensureProductionConsent
} = require("./shared/firebaseSetup");

loadEnv();

let db = null;

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

async function main() {
  const { usingEmulator, projectId } = initializeFirebaseApp();
  const confirmed = await ensureProductionConsent({
    usingEmulator,
    projectId,
    scriptName: "backfillUserStats"
  });
  if (!confirmed) {
    console.log("確認が取れなかったため処理を中断します。");
    return;
  }
  if (usingEmulator) {
    console.log("Firestore emulator detected; using emulator credentials.");
  }
  db = admin.firestore();

  const metrics = { reads: 0, writes: 0, deletes: 0 };

  const snapshot = await db.collection("results").get();
  metrics.reads += snapshot.size;
  console.log(`Processing ${snapshot.size} results...`);

  let batch = db.batch();
  let opsInBatch = 0;
  const entriesByUser = new Map();

  for (const doc of snapshot.docs) {
    const entries = buildEntries(doc.id, doc.data());
    for (const entry of entries) {
      const statsRef = db
        .collection("users")
        .doc(entry.uid)
        .collection("stats")
        .doc(entry.resultId);

      batch.set(
        statsRef,
        {
          gameMode: entry.gameMode,
          playedAt: entry.playedAt || entry.date || null,
          order: entry.order,
          participantCount: entry.participantCount,
          rank: entry.rank,
          totalScore: entry.score,
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      metrics.writes += 1;

      opsInBatch += 1;
      if (!entriesByUser.has(entry.uid)) {
        entriesByUser.set(entry.uid, []);
      }
      entriesByUser.get(entry.uid).push(entry);

      if (opsInBatch >= 400) {
        await batch.commit();
        batch = db.batch();
        opsInBatch = 0;
      }
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
  }

  for (const [uid, entries] of entriesByUser.entries()) {
    const { modes, colorCounts, favoriteColor } = buildSummary(entries);
    const summaryRef = db
      .collection("users")
      .doc(uid)
      .collection("statsSummary")
      .doc("modes");

    if (
      Object.keys(modes).length === 0 &&
      Object.keys(colorCounts).length === 0
    ) {
      try {
        await summaryRef.delete();
        metrics.writes += 1;
        metrics.deletes += 1;
      } catch (error) {
        // ignore cleanup errors to keep previous behavior
      }
    } else {
      Object.keys(modes).forEach(modeKey => {
        modes[modeKey].updatedAt = FieldValue.serverTimestamp();
      });
      await summaryRef.set(
        {
          modes,
          colorCounts,
          favoriteColor,
          type: "summary",
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      metrics.writes += 1;
    }
  }

  console.log(
    `Firestore usage (estimated): reads=${metrics.reads}, writes=${metrics.writes}, deletes=${metrics.deletes}`
  );
  console.log("Backfill completed.");
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
      uid: player.uid,
      rank: rankMap.get(player.uid) || index + 1,
      order: Number.isInteger(player.order) ? player.order : null,
      score: player.score?.total || 0,
      color: player.color || null,
      playedAt: matchDate,
      participantCount,
      gameMode,
      resultId,
      ratingBefore: toFiniteNumber(player.ratingBefore),
      ratingAfter: toFiniteNumber(player.ratingAfter)
    }));
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

function buildSummary(entries) {
  const perMode = {};
  const colorCounts = {};
  entries.forEach(entry => {
    const mode = entry.gameMode;
    if (!perMode[mode]) {
      perMode[mode] = createEmptyModeSummary();
    }
    accumulateMode(perMode[mode], entry);

    if (entry.color) {
      colorCounts[entry.color] = (colorCounts[entry.color] || 0) + 1;
    }
  });

  Object.keys(perMode).forEach(mode => {
    const summary = perMode[mode];
    if (summary.playCount <= 0) {
      delete perMode[mode];
    } else {
      sanitizeModeSummary(summary);
    }
  });

  const sanitizedColorCounts = sanitizeColorCounts(colorCounts);
  const favoriteColor = determineFavoriteColor(sanitizedColorCounts) || null;

  return {
    modes: perMode,
    colorCounts: sanitizedColorCounts,
    favoriteColor
  };
}

function accumulateMode(summary, entry) {
  const score = Number.isFinite(entry.score) ? entry.score : 0;
  const playedAt = entry.playedAt || entry.date || null;
  const entryMillis = toMillis(playedAt);

  summary.playCount += 1;
  summary.scoreTotal += score;

  if (
    !summary.highestScore ||
    score > summary.highestScore.score ||
    (score === summary.highestScore.score &&
      entryMillis > toMillis(summary.highestScore.playedAt))
  ) {
    summary.highestScore = {
      resultId: entry.resultId,
      score,
      playedAt
    };
  }

  if (
    !summary.lowestScore ||
    score < summary.lowestScore.score ||
    (score === summary.lowestScore.score &&
      entryMillis < toMillis(summary.lowestScore.playedAt))
  ) {
    summary.lowestScore = {
      resultId: entry.resultId,
      score,
      playedAt
    };
  }

  if (!summary.lastPlayedAt || entryMillis >= toMillis(summary.lastPlayedAt)) {
    summary.lastPlayedAt = playedAt;
    summary.lastResultId = entry.resultId;
  }

  if (
    entry.ratingAfter !== null &&
    entry.ratingAfter !== undefined &&
    Number.isFinite(entry.ratingAfter)
  ) {
    if (
      summary._ratingMillis === null ||
      entryMillis > summary._ratingMillis ||
      (entryMillis === summary._ratingMillis &&
        summary._ratingSource !== "after")
    ) {
      summary.rating = entry.ratingAfter;
      summary._ratingMillis = entryMillis;
      summary._ratingSource = "after";
    }
  } else if (
    entry.ratingBefore !== null &&
    entry.ratingBefore !== undefined &&
    Number.isFinite(entry.ratingBefore)
  ) {
    const shouldUpdate =
      summary._ratingMillis === null ||
      entryMillis > summary._ratingMillis ||
      (entryMillis === summary._ratingMillis &&
        summary._ratingSource !== "after");

    if (shouldUpdate) {
      summary.rating = entry.ratingBefore;
      summary._ratingMillis = entryMillis;
      summary._ratingSource = "before";
    }
  }
}

function sanitizeModeSummary(summary) {
  if (summary.playCount < 0) {
    summary.playCount = 0;
  }
  if (!summary.highestScore) {
    summary.highestScore = null;
  }
  if (!summary.lowestScore) {
    summary.lowestScore = null;
  }
  if (summary.rating !== null && !Number.isFinite(summary.rating)) {
    summary.rating = null;
  }
  if (!summary.lastPlayedAt) {
    summary.lastPlayedAt = null;
  }
  if (!summary.lastResultId) {
    summary.lastResultId = null;
  }
  delete summary._ratingSource;
  delete summary._ratingMillis;
  delete summary.favoriteColor;
}

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
    lastPlayedAt: null,
    lastResultId: null,
    _ratingSource: null,
    _ratingMillis: null
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

function toFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toMillis(date) {
  if (!date) return 0;
  if (typeof date.toMillis === "function") {
    return date.toMillis();
  }
  if (date.seconds !== undefined) {
    return date.seconds * 1000 + (date.nanoseconds || 0) / 1e6;
  }
  return Number(date) || 0;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
