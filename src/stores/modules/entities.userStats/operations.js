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

export const fetchUserStatsById = (
  uid,
  { gameMode = DEFAULT_GAME_MODE } = {}
) => async dispatch => {
  if (!uid) return;

  let query = db
    .collection("users")
    .doc(uid)
    .collection("stats");
  if (gameMode) {
    query = query.where("gameMode", "==", gameMode);
  }
  query = query.orderBy("playedAt", "desc");

  const snapshot = await query.get();

  const entries = snapshot.docs
    .filter(doc => doc.id !== "summary" && doc.data()?.type !== "summary")
    .map(doc => ({
      resultId: doc.id,
      ...doc.data()
    }));

  if (entries.length === 0) {
    dispatch(actions.remove(uid));
    return;
  }

  const summary = buildSummary(entries);
  dispatch(
    actions.update(uid, {
      ...summary,
      mode: gameMode || DEFAULT_GAME_MODE
    })
  );
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
        date: playedAt
      };
    }
    if (!lowestScore || totalScore < lowestScore.score) {
      lowestScore = {
        resultId: entry.resultId,
        score: totalScore,
        date: playedAt
      };
    }

    recentResults.push({
      resultId: entry.resultId,
      rank: numericRank,
      score: totalScore,
      date: playedAt
    });
  });

  recentResults.sort((a, b) => toMillis(b.date) - toMillis(a.date));

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
