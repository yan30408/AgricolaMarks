const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const {
  createInitialState,
  conservativeRating,
  rateMatch,
  RATING_STATE_VERSION
} = require("./lib/trueskill");
const { rebuildAllRatings } = require("./lib/rebuildAll");
const {
  synchronizeSummariesWithRatingStates
} = require("./lib/synchronizeSummaries");

if (!admin.apps.length) {
  admin.initializeApp();
}

const REGION = "asia-northeast1";
const db = admin.firestore();
const rebuildLockRef = db.collection("meta").doc("ratingLock");

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

const RESULT_RATING_VERSION = 1;

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

function clearRatingsFromPlayers(players) {
  if (!Array.isArray(players)) {
    return [];
  }
  return players.map(player => {
    if (!player || typeof player !== "object") {
      return player;
    }
    const {
      ratingBefore,
      ratingAfter,
      ratingVersion,
      ratingDelta,
      ratingChange,
      ...rest
    } = player;
    return { ...rest };
  });
}

function stripRatingFieldsFromPlayers(players) {
  return clearRatingsFromPlayers(players);
}

function computeRatingSignature(result) {
  if (!result) {
    return "none";
  }
  const mode = normalizeGameMode(result.gameMode);
  const players = Array.isArray(result.results) ? result.results : [];
  const tokens = players
    .filter(player => player && player.uid)
    .map(player => {
      const uid = String(player.uid);
      const rank = Number.isFinite(player.rank) ? Number(player.rank) : "";
      return `${uid}:${rank}`;
    })
    .sort();
  return `${mode}|${tokens.length}|${tokens.join(",")}`;
}

function isInternalRatingUpdate(before, after) {
  if (!before || !after) {
    return false;
  }
  const beforeMode = normalizeGameMode(before.gameMode);
  const afterMode = normalizeGameMode(after.gameMode);
  if (beforeMode !== afterMode) {
    return false;
  }
  const beforePlayers = stripRatingFieldsFromPlayers(before.results);
  const afterPlayers = stripRatingFieldsFromPlayers(after.results);
  if (JSON.stringify(beforePlayers) !== JSON.stringify(afterPlayers)) {
    return false;
  }
  return true;
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

    if (before && after && isInternalRatingUpdate(before, after)) {
      return null;
    }

    const isCreate = !before && !!after;
    const isDelete = !!before && !after;
    const isUpdate = !!before && !!after;

    const beforeEntries = before ? buildEntries(resultId, before) : [];
    const afterEntries = after ? buildEntries(resultId, after) : [];

    const beforeSignature = before ? computeRatingSignature(before) : null;
    const afterSignature = after ? computeRatingSignature(after) : null;
    const needsRebuild =
      isDelete || (isUpdate && beforeSignature !== afterSignature);
    const skipRebuild = after?.ratingRebuildPending === true;

    if (skipRebuild) {
      functions.logger.info("Deferred rating rebuild due to merge operation", {
        resultId
      });
    } else if (needsRebuild) {
      const reason = isDelete ? "delete" : "update";
      const acquired = await runFullRebuild(resultId, reason);
      if (!acquired) {
        functions.logger.warn(
          "Skipped rating rebuild because another rebuild is already running",
          {
            resultId,
            reason
          }
        );
      }
      return null;
    }

    if (isCreate && after) {
      if (await isRebuildLocked()) {
        functions.logger.warn(
          "Rating rebuild in progress. Skipping incremental rating update for new result.",
          { resultId }
        );
        return null;
      }

      const signature = afterSignature || computeRatingSignature(after);
      await applyRatingsForResult(change.after.ref, after, signature);
    }

    if (beforeEntries.length) {
      await applyUserChanges(beforeEntries, "remove");
      await applyGlobalChange(beforeEntries, "remove", false);
    }
    if (afterEntries.length) {
      await applyUserChanges(afterEntries, "add");
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
    const updatedResultIds = [];
    for (const resultId of resultIds) {
      const status = await mergeResultDocument(resultId, sourceUid, targetUid);
      if (status === true) {
        mergedCount += 1;
        updatedResultIds.push(resultId);
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

    if (updatedResultIds.length > 0) {
      const rebuildReason = `merge:${sourceUid}->${targetUid}`;
      try {
        const acquired = await runFullRebuild(
          updatedResultIds[0],
          rebuildReason
        );
        if (!acquired) {
          functions.logger.warn(
            "Deferred post-merge rating rebuild because another rebuild is running",
            { sourceUid, targetUid }
          );
        }
      } finally {
        await Promise.all(
          updatedResultIds.map(resultId =>
            db
              .collection("results")
              .doc(resultId)
              .update({
                ratingRebuildPending: FieldValue.delete()
              })
              .catch(error => {
                functions.logger.warn(
                  "Failed to clear ratingRebuildPending flag",
                  {
                    resultId,
                    error: error?.message || String(error)
                  }
                );
              })
          )
        );
      }
    }

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
      playedAt: matchDate,
      participantCount,
      gameMode
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
      updatedAt: FieldValue.serverTimestamp(),
      ratingRebuildPending: true
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
            totalScore: entry.score,
            color: entry.color || null,
            ratingBefore: FieldValue.delete(),
            ratingAfter: FieldValue.delete(),
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
  }

  for (const [uid, userEntries] of entriesByUser.entries()) {
    if (operation === "add") {
      await incrementUserSummary(uid, userEntries);
    } else {
      await rebuildUserSummary(uid);
    }
  }
}

async function incrementUserSummary(uid, entries) {
  if (!uid || !entries.length) {
    return;
  }

  const userRef = db.collection("users").doc(uid);
  const summaryRef = userRef.collection("statsSummary").doc("modes");

  const entriesByMode = new Map();
  entries.forEach(entry => {
    const mode = normalizeGameMode(entry.gameMode);
    if (!entriesByMode.has(mode)) {
      entriesByMode.set(mode, []);
    }
    entriesByMode.get(mode).push(entry);
  });

  const ratingStates = new Map();
  await Promise.all(
    Array.from(entriesByMode.keys()).map(async mode => {
      const stateSnapshot = await db
        .collection("users")
        .doc(uid)
        .collection("ratingStates")
        .doc(mode)
        .get();
      if (stateSnapshot.exists) {
        ratingStates.set(mode, stateSnapshot.data() || {});
      }
    })
  );

  await db.runTransaction(async tx => {
    const snapshot = await tx.get(summaryRef);
    const existing = snapshot.exists ? snapshot.data() || {} : {};
    const modes =
      existing.modes && typeof existing.modes === "object"
        ? { ...existing.modes }
        : {};
    const colorCounts = sanitizeColorCounts(existing.colorCounts);

    entries.forEach(entry => {
      const color = entry.color || null;
      if (color) {
        colorCounts[color] = (colorCounts[color] || 0) + 1;
      }
    });

    entriesByMode.forEach((modeEntries, mode) => {
      const scores = modeEntries.map(entry => Number(entry.score) || 0);
      const scoreSum = scores.reduce((total, value) => total + value, 0);
      const summary =
        modes[mode] && typeof modes[mode] === "object"
          ? { ...modes[mode] }
          : {
              playCount: 0,
              scoreTotal: 0,
              highestScore: null,
              lowestScore: null,
              rating: null,
              sigma: null,
              lastPlayedAt: null,
              lastResultId: null,
              updatedAt: null
            };

      summary.playCount = Math.max(
        0,
        Math.round(Number(summary.playCount) || 0)
      );
      summary.playCount += modeEntries.length;
      summary.scoreTotal = Number(summary.scoreTotal) || 0;
      summary.scoreTotal += scoreSum;

      modeEntries.forEach(entry => {
        const playedAt = entry.playedAt || entry.date || null;
        const candidate = {
          resultId: entry.resultId,
          score: Number(entry.score) || 0,
          playedAt
        };

        const isHigher =
          !summary.highestScore ||
          candidate.score > Number(summary.highestScore.score) ||
          (candidate.score === Number(summary.highestScore.score) &&
            toMillis(playedAt) >
              toMillis(summary.highestScore?.playedAt || null));
        if (isHigher) {
          summary.highestScore = candidate;
        }

        const isLower =
          !summary.lowestScore ||
          candidate.score < Number(summary.lowestScore.score) ||
          (candidate.score === Number(summary.lowestScore.score) &&
            toMillis(playedAt) <
              toMillis(summary.lowestScore?.playedAt || null));
        if (isLower) {
          summary.lowestScore = candidate;
        }

        if (
          !summary.lastPlayedAt ||
          toMillis(playedAt) >= toMillis(summary.lastPlayedAt)
        ) {
          summary.lastPlayedAt = playedAt;
          summary.lastResultId = entry.resultId;
        }
      });

      const ratingState = ratingStates.get(mode);
      if (
        ratingState &&
        Number.isFinite(ratingState.mu) &&
        Number.isFinite(ratingState.sigma)
      ) {
        summary.rating = conservativeRating(ratingState.mu, ratingState.sigma);
        summary.sigma = ratingState.sigma;
      }

      summary.updatedAt = FieldValue.serverTimestamp();
      modes[mode] = summary;
    });

    const favoriteColor = determineFavoriteColor(colorCounts) || null;

    tx.set(
      summaryRef,
      {
        modes,
        colorCounts: sanitizeColorCounts(colorCounts),
        favoriteColor,
        type: "summary",
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  });
}

async function rebuildUserSummary(uid) {
  if (!uid) {
    return;
  }

  const userRef = db.collection("users").doc(uid);
  const statsRef = userRef.collection("stats");
  const snapshot = await statsRef.get();

  if (snapshot.empty) {
    await userRef
      .collection("statsSummary")
      .doc("modes")
      .delete()
      .catch(() => {});
    return;
  }

  const perMode = new Map();
  const colorCounts = {};

  const colorFetches = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    const mode = normalizeGameMode(data.gameMode);
    if (!perMode.has(mode)) {
      perMode.set(mode, {
        playCount: 0,
        scoreTotal: 0,
        highestScore: null,
        lowestScore: null,
        rating: null,
        ratingSigma: null,
        lastPlayedAt: null,
        lastResultId: null
      });
    }
    const aggregate = perMode.get(mode);
    const score = Number.isFinite(data.totalScore) ? data.totalScore : 0;
    const playedAt = data.playedAt || null;
    const candidate = {
      resultId: doc.id,
      score,
      playedAt
    };

    aggregate.playCount += 1;
    aggregate.scoreTotal += score;

    if (
      !aggregate.highestScore ||
      score > aggregate.highestScore.score ||
      (score === aggregate.highestScore.score &&
        toMillis(playedAt) > toMillis(aggregate.highestScore.playedAt))
    ) {
      aggregate.highestScore = candidate;
    }

    if (
      !aggregate.lowestScore ||
      score < aggregate.lowestScore.score ||
      (score === aggregate.lowestScore.score &&
        toMillis(playedAt) < toMillis(aggregate.lowestScore.playedAt))
    ) {
      aggregate.lowestScore = candidate;
    }

    if (
      !aggregate.lastPlayedAt ||
      toMillis(playedAt) >= toMillis(aggregate.lastPlayedAt)
    ) {
      aggregate.lastPlayedAt = playedAt;
      aggregate.lastResultId = doc.id;
    }

    const color = data.color || null;
    if (color) {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    } else {
      colorFetches.push(
        db
          .collection("results")
          .doc(doc.id)
          .get()
          .then(resultSnapshot => {
            if (!resultSnapshot.exists) {
              return;
            }
            const resultData = resultSnapshot.data() || {};
            const players = Array.isArray(resultData.results)
              ? resultData.results
              : [];
            const playerEntry = players.find(
              player => player && player.uid === uid
            );
            const entryColor = playerEntry?.color || null;
            if (entryColor) {
              colorCounts[entryColor] = (colorCounts[entryColor] || 0) + 1;
            }
          })
          .catch(error => {
            functions.logger?.warn?.("Failed to load result color", {
              uid,
              resultId: doc.id,
              error: error?.message || String(error)
            });
          })
      );
    }
  }

  if (colorFetches.length) {
    await Promise.all(colorFetches);
  }

  const modeKeys = Array.from(perMode.keys());
  if (!modeKeys.length) {
    await userRef
      .collection("statsSummary")
      .doc("modes")
      .delete()
      .catch(() => {});
    return;
  }

  const ratingStatesCollection = userRef.collection("ratingStates");
  const userStates = new Map();
  await Promise.all(
    modeKeys.map(async mode => {
      const stateSnapshot = await ratingStatesCollection.doc(mode).get();
      if (!stateSnapshot.exists) {
        return;
      }
      const state = stateSnapshot.data() || {};
      if (
        Number.isFinite(state.mu) &&
        Number.isFinite(state.sigma) &&
        state.version === RATING_STATE_VERSION
      ) {
        userStates.set(mode, state);
        const aggregate = perMode.get(mode);
        aggregate.rating = conservativeRating(state.mu, state.sigma);
        aggregate.ratingSigma = state.sigma;
      }
    })
  );

  const sanitizedColorCounts = sanitizeColorCounts(colorCounts);
  const favoriteColor = determineFavoriteColor(sanitizedColorCounts) || null;

  const modesPayload = {};
  modeKeys.forEach(mode => {
    const aggregate = perMode.get(mode);
    const state = userStates.get(mode);
    const rating =
      state && Number.isFinite(state.mu) && Number.isFinite(state.sigma)
        ? conservativeRating(state.mu, state.sigma)
        : typeof aggregate.rating === "number" &&
          Number.isFinite(aggregate.rating)
        ? aggregate.rating
        : null;
    const sigma = state && Number.isFinite(state.sigma) ? state.sigma : null;

    modesPayload[mode] = {
      playCount: Math.max(0, Math.round(aggregate.playCount || 0)),
      scoreTotal: Number(aggregate.scoreTotal) || 0,
      highestScore: aggregate.highestScore || null,
      lowestScore: aggregate.lowestScore || null,
      rating,
      sigma,
      lastPlayedAt: aggregate.lastPlayedAt || null,
      lastResultId: aggregate.lastResultId || null,
      updatedAt: FieldValue.serverTimestamp()
    };
  });

  await userRef
    .collection("statsSummary")
    .doc("modes")
    .set(
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

async function isRebuildLocked() {
  const snapshot = await rebuildLockRef.get();
  return snapshot.exists && snapshot.data()?.locked;
}

async function acquireRebuildLock(reason, resultId) {
  try {
    await db.runTransaction(async tx => {
      const snapshot = await tx.get(rebuildLockRef);
      if (snapshot.exists && snapshot.data()?.locked) {
        throw new Error("LOCKED");
      }
      tx.set(rebuildLockRef, {
        locked: true,
        reason: reason || null,
        resultId: resultId || null,
        startedAt: FieldValue.serverTimestamp()
      });
    });
    return true;
  } catch (error) {
    if (error.message === "LOCKED") {
      return false;
    }
    throw error;
  }
}

async function releaseRebuildLock(status) {
  await rebuildLockRef.set(
    {
      locked: false,
      status: status || "idle",
      finishedAt: FieldValue.serverTimestamp(),
      reason: null,
      resultId: null
    },
    { merge: true }
  );
}

async function runFullRebuild(resultId, reason) {
  const acquired = await acquireRebuildLock(reason, resultId);
  if (!acquired) {
    return false;
  }
  try {
    await rebuildAllRatings({
      db,
      FieldValue,
      logger: functions.logger
    });
    await synchronizeSummariesWithRatingStates({
      db,
      FieldValue,
      logger: functions.logger
    });
    await releaseRebuildLock("success");
    return true;
  } catch (error) {
    await releaseRebuildLock("error");
    functions.logger.error("Rating rebuild failed", {
      resultId,
      reason,
      message: error?.message || String(error)
    });
    throw error;
  }
}

function normalizeRatingState(data) {
  if (!data || typeof data !== "object") {
    return createInitialState();
  }
  const mu = Number(data.mu);
  const sigma = Number(data.sigma);
  if (!Number.isFinite(mu) || !Number.isFinite(sigma)) {
    return createInitialState();
  }
  return {
    version:
      data.version === RATING_STATE_VERSION
        ? data.version
        : RATING_STATE_VERSION,
    mu,
    sigma,
    lastResultId: data.lastResultId || null,
    lastPlayedAt: data.lastPlayedAt || null,
    historyVersion: Number.isFinite(data.historyVersion)
      ? data.historyVersion
      : 1
  };
}

async function applyRatingsForResult(resultRef, resultData, signature) {
  const mode = normalizeGameMode(resultData.gameMode);
  const entries = buildEntries(resultRef.id, resultData).filter(
    entry => entry.uid
  );

  if (!entries.length) {
    await resultRef.update({
      results: clearRatingsFromPlayers(resultData.results),
      ratingMeta: {
        version: RESULT_RATING_VERSION,
        signature,
        status: "applied",
        updatedAt: FieldValue.serverTimestamp()
      }
    });
    return;
  }

  const ratingStates = await Promise.all(
    entries.map(async entry => {
      const ref = db.doc(`users/${entry.uid}/ratingStates/${mode}`);
      const snapshot = await ref.get();
      const state = normalizeRatingState(
        snapshot.exists ? snapshot.data() : null
      );
      return { uid: entry.uid, ref, state };
    })
  );

  const stateLookup = new Map();
  ratingStates.forEach(({ uid, state }) => {
    stateLookup.set(uid, state);
  });

  const { outcomes, newStates } = rateMatch(entries, stateLookup);
  const entryByUid = new Map(entries.map(entry => [entry.uid, entry]));

  const updatedPlayers = (Array.isArray(resultData.results)
    ? resultData.results
    : []
  ).map(player => {
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
      sanitized.ratingVersion = RESULT_RATING_VERSION;
    }
    return sanitized;
  });

  const batch = db.batch();
  ratingStates.forEach(({ uid, ref }) => {
    const newState = newStates.get(uid);
    if (!newState) {
      return;
    }
    const entry = entryByUid.get(uid);
    const existingState = stateLookup.get(uid) || createInitialState();
    batch.set(
      ref,
      {
        version: RATING_STATE_VERSION,
        mu: newState.mu,
        sigma: newState.sigma,
        lastResultId: resultRef.id,
        lastPlayedAt:
          entry?.playedAt || resultData.playedAt || resultData.date || null,
        historyVersion: Number.isFinite(existingState.historyVersion)
          ? existingState.historyVersion
          : 1,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  });

  batch.update(resultRef, {
    results: updatedPlayers,
    ratingMeta: {
      version: RESULT_RATING_VERSION,
      signature,
      status: "applied",
      updatedAt: FieldValue.serverTimestamp()
    }
  });

  await batch.commit();
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
