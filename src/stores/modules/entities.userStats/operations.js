import actions from "./actions";
import { db } from "initializer";
import { DEFAULT_GAME_MODE } from "Constants";

const EMPTY_SUMMARY = Object.freeze({
  playCount: 0,
  winCount: 0,
  scoreTotal: 0,
  rankHistogram: emptyRankHistogram(),
  orderHistogram: emptyOrderHistogram(),
  favoriteColor: null,
  highestScore: null,
  lowestScore: null,
  recentResults: [],
  rating: null
});

const getUserStatsState = (getState, uid) =>
  getState()?.entities?.userStats?.byId?.[uid] || null;

const getResultIdsState = (getState, uid, modeKey) =>
  getState()?.entities?.userStats?.resultIdsByMode?.[uid]?.[modeKey] || null;

const toModeKey = mode => mode || DEFAULT_GAME_MODE;

const mergeSummaryIntoState = (dispatch, getState, uid, modeKey, summary) => {
  const previous = getUserStatsState(getState, uid);
  const nextModes = { ...(previous?.modes || {}) };

  if (!summary) {
    delete nextModes[modeKey];
    const remaining = Object.entries(nextModes);
    if (remaining.length === 0) {
      dispatch(actions.remove(uid));
      return;
    }
    const [fallbackMode, fallbackSummary] = remaining[0];
    dispatch(
      actions.update(uid, {
        ...fallbackSummary,
        mode: fallbackMode,
        modes: nextModes
      })
    );
    return;
  }

  const summaryClone = { ...summary };
  nextModes[modeKey] = summaryClone;

  dispatch(
    actions.update(uid, {
      ...summaryClone,
      mode: modeKey,
      modes: nextModes
    })
  );
};

const mapSnapshotToEntries = snapshot =>
  snapshot.docs
    .filter(doc => doc.id !== "summary" && doc.data()?.type !== "summary")
    .map(doc => ({
      resultId: doc.id,
      ...doc.data()
    }));

export const fetchUserStatsById = (
  uid,
  { gameMode = DEFAULT_GAME_MODE, force = false } = {}
) => async (dispatch, getState) => {
  if (!uid) return null;

  const modeKey = toModeKey(gameMode);
  const existingSummary = getUserStatsState(getState, uid)?.modes?.[modeKey];
  const existingIds = getResultIdsState(getState, uid, modeKey);
  if (existingSummary && Array.isArray(existingIds) && !force) {
    return existingSummary;
  }

  let query = db
    .collection("users")
    .doc(uid)
    .collection("stats");
  if (gameMode) {
    query = query.where("gameMode", "==", gameMode);
  }
  query = query.orderBy("playedAt", "desc");

  try {
    const snapshot = await query.get();
    const entries = mapSnapshotToEntries(snapshot);
    if (entries.length === 0) {
      dispatch(actions.clearResultIds(uid, modeKey));
      mergeSummaryIntoState(dispatch, getState, uid, modeKey, null);
      return null;
    }

    const summary = buildSummary(entries);
    mergeSummaryIntoState(dispatch, getState, uid, modeKey, summary);
    const resultIds = entries
      .map(entry => entry.resultId)
      .filter(id => typeof id === "string" && id.length > 0);
    dispatch(actions.setResultIds(uid, modeKey, resultIds));
    return summary;
  } catch (error) {
    console.error("Failed to fetch user stats", error);
    return existingSummary || null;
  }
};

export const ensureUserStatsById = (
  uid,
  { gameMode = DEFAULT_GAME_MODE } = {}
) => async (dispatch, getState) => {
  if (!uid) return null;
  const modeKey = toModeKey(gameMode);
  const existingSummary = getUserStatsState(getState, uid)?.modes?.[modeKey];
  const existingIds = getResultIdsState(getState, uid, modeKey);
  if (existingSummary && Array.isArray(existingIds)) {
    return existingSummary;
  }
  return dispatch(fetchUserStatsById(uid, { gameMode, force: true }));
};

export const resetUserStatsCache = () => dispatch => {
  dispatch(actions.init());
};

function buildSummary(entries) {
  if (!entries.length) {
    return EMPTY_SUMMARY;
  }

  let scoreTotal = 0;
  const rankHistogram = emptyRankHistogram();
  const orderHistogram = emptyOrderHistogram();
  const colorCounts = {};
  const recentResults = [];

  let playCount = 0;
  let winCount = 0;
  let favoriteColor = null;
  let highestScore = null;
  let lowestScore = null;

  entries.forEach(entry => {
    const totalScore =
      entry.totalScore ??
      entry.score ??
      entry.scoreTotal ??
      entry.score_total ??
      0;
    const rankValue = normalizeRank(entry.rank);
    const numericRank = Number.isFinite(Number(entry.rank))
      ? Number(entry.rank)
      : Number(rankValue);

    scoreTotal += totalScore;
    playCount += 1;

    rankHistogram[rankValue] = (rankHistogram[rankValue] || 0) + 1;

    const orderKey = normalizeOrder(entry.order);
    const orderBucket = orderHistogram[orderKey] || { plays: 0, wins: 0 };
    orderBucket.plays += 1;
    if (numericRank === 1) {
      orderBucket.wins += 1;
      winCount += 1;
    }
    orderHistogram[orderKey] = orderBucket;

    if (entry.color) {
      colorCounts[entry.color] = (colorCounts[entry.color] || 0) + 1;
      if (
        !favoriteColor ||
        colorCounts[entry.color] > (colorCounts[favoriteColor] || 0)
      ) {
        favoriteColor = entry.color;
      }
    }

    const playedAt = entry.playedAt || entry.date || null;

    if (!highestScore || totalScore > highestScore.score) {
      highestScore = {
        resultId: entry.resultId,
        score: totalScore,
        playedAt
      };
    }
    if (!lowestScore || totalScore < lowestScore.score) {
      lowestScore = {
        resultId: entry.resultId,
        score: totalScore,
        playedAt
      };
    }

    recentResults.push({
      resultId: entry.resultId,
      rank: numericRank,
      score: totalScore,
      playedAt
    });
  });

  recentResults.sort(
    (a, b) => toMillis(b.playedAt || b.date) - toMillis(a.playedAt || a.date)
  );

  return {
    playCount,
    winCount,
    scoreTotal,
    rankHistogram,
    orderHistogram,
    favoriteColor,
    highestScore,
    lowestScore,
    recentResults: recentResults.slice(0, 5),
    rating: null
  };
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

function emptyRankHistogram() {
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
    histogram[String(order)] = { plays: 0, wins: 0 };
  }
  histogram.unknown = { plays: 0, wins: 0 };
  return histogram;
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
