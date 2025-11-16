import { TrueSkill, Rating } from "ts-trueskill";

const BASE_SIGMA = 8.333;
const BASE_MU = 25.0;
const BASE_BETA = BASE_SIGMA / 2;
const BASE_TAU = BASE_SIGMA / 100;
const BASE_DRAW_PROBABILITY = 0.1;
const INTERNAL_PRECISION = 6;
const CONSERVATIVE_MULTIPLIER = 3;

const ratingEnvironment = new TrueSkill(
  BASE_MU,
  BASE_SIGMA,
  BASE_BETA,
  BASE_TAU,
  BASE_DRAW_PROBABILITY
);

// ts-trueskill が sigma 等の上書きを行わないため明示的に指定値を保つ
ratingEnvironment.mu = BASE_MU;
ratingEnvironment.sigma = BASE_SIGMA;
ratingEnvironment.beta = BASE_BETA;
ratingEnvironment.tau = BASE_TAU;
ratingEnvironment.drawProbability = BASE_DRAW_PROBABILITY;

const round = (value, digits = INTERNAL_PRECISION) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const createInitialState = () => ({
  mu: BASE_MU,
  sigma: BASE_SIGMA
});

export const createStateFromConservative = (rating, sigma = BASE_SIGMA) => {
  if (!Number.isFinite(rating)) {
    return createInitialState();
  }
  const normalizedSigma =
    Number.isFinite(sigma) && sigma > 0 ? sigma : BASE_SIGMA;
  const mu = rating + CONSERVATIVE_MULTIPLIER * normalizedSigma;
  return {
    mu,
    sigma: normalizedSigma
  };
};

export const createStateFromSummary = summary => {
  if (!summary || typeof summary !== "object") {
    return createInitialState();
  }
  const { rating, sigma } = summary;
  if (!Number.isFinite(rating)) {
    return createInitialState();
  }
  return createStateFromConservative(rating, sigma);
};
export const conservativeRating = (mu, sigma) =>
  round(mu - CONSERVATIVE_MULTIPLIER * sigma, 2);

export const rateMatch = (entries, stateLookup) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { outcomes: new Map(), newStates: new Map() };
  }

  const sorted = [...entries].sort((a, b) => {
    const rankDiff = Number(a.rank || 0) - Number(b.rank || 0);
    if (rankDiff !== 0) {
      return rankDiff;
    }
    const orderDiff =
      Number.isFinite(a.order) && Number.isFinite(b.order)
        ? Number(a.order) - Number(b.order)
        : 0;
    if (orderDiff !== 0) {
      return orderDiff;
    }
    return String(a.uid || "").localeCompare(String(b.uid || ""));
  });

  const groups = [];
  let currentRank = null;
  sorted.forEach(entry => {
    const rank = Number(entry.rank) || 1;
    if (currentRank === null || rank !== currentRank) {
      currentRank = rank;
      groups.push([]);
    }
    const state = stateLookup.get(entry.uid) || createInitialState();
    groups[groups.length - 1].push({
      entry,
      state,
      ratingBefore: new Rating(state.mu, state.sigma)
    });
  });

  const ratingGroups = groups.map(group =>
    group.map(info => info.ratingBefore)
  );

  const ratedGroups =
    ratingGroups.length > 1
      ? ratingEnvironment.rate(ratingGroups)
      : ratingGroups;

  const outcomes = new Map();
  const newStates = new Map();

  groups.forEach((group, groupIndex) => {
    group.forEach((info, playerIndex) => {
      const updatedRating =
        ratingGroups.length > 1
          ? ratedGroups[groupIndex][playerIndex]
          : info.ratingBefore;
      const afterMu = round(updatedRating.mu, INTERNAL_PRECISION);
      const afterSigma = round(updatedRating.sigma, INTERNAL_PRECISION);

      const ratingBefore = conservativeRating(info.state.mu, info.state.sigma);
      const ratingAfter = conservativeRating(afterMu, afterSigma);

      outcomes.set(info.entry.uid, {
        ratingBefore,
        ratingAfter,
        muAfter: afterMu,
        sigmaAfter: afterSigma
      });
      newStates.set(info.entry.uid, {
        mu: afterMu,
        sigma: afterSigma
      });
    });
  });

  return { outcomes, newStates };
};
