const crypto = require("crypto");
const { TrueSkill, Rating } = require("ts-trueskill");

const RATING_STATE_VERSION = 1;
const CONSERVATIVE_MULTIPLIER = 3;
const RATING_DECIMALS = 2;
const INTERNAL_PRECISION = 6;

const BASE_SIGMA = 8.333; //150;
const BASE_MU = 25; //1950; // BASE_MU - 3 * BASE_SIGMA = 1500
const BASE_BETA = BASE_SIGMA / 2;
const BASE_TAU = BASE_SIGMA / 100;
const BASE_DRAW_PROBABILITY = 0.1;

const ratingEnvironment = new TrueSkill(
  BASE_MU,
  BASE_SIGMA,
  BASE_BETA,
  BASE_TAU,
  BASE_DRAW_PROBABILITY
);

// ts-trueskill が sigma 等の上書きを行わないため明示的に指定値を保つ
// https://github.com/scttcper/ts-trueskill/issues/228
ratingEnvironment.mu = BASE_MU;
ratingEnvironment.sigma = BASE_SIGMA;
ratingEnvironment.beta = BASE_BETA;
ratingEnvironment.tau = BASE_TAU;
ratingEnvironment.drawProbability = BASE_DRAW_PROBABILITY;

function createInitialState() {
  return {
    version: RATING_STATE_VERSION,
    mu: BASE_MU,
    sigma: BASE_SIGMA,
    lastResultId: null,
    lastPlayedAt: null
  };
}

function conservativeRating(mu, sigma) {
  const value = mu - CONSERVATIVE_MULTIPLIER * sigma;
  return round(value, RATING_DECIMALS);
}

function round(value, digits = RATING_DECIMALS) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildHashPayload(players) {
  return players
    .map(player => ({
      uid: player.uid || "",
      rank: Number.isFinite(player.rank) ? Number(player.rank) : null,
      order: Number.isFinite(player.order) ? Number(player.order) : null,
      score: Number.isFinite(player.score?.total)
        ? Number(player.score.total)
        : Number(player.score) || 0,
      color: player.color || "",
      team: player.team || null
    }))
    .sort((a, b) => {
      if (a.rank !== b.rank) {
        return (a.rank || 0) - (b.rank || 0);
      }
      if (a.order !== b.order) {
        return (a.order || 0) - (b.order || 0);
      }
      return a.uid.localeCompare(b.uid);
    });
}

function computePlayersHash(players) {
  const digest = crypto.createHash("sha1");
  buildHashPayload(players).forEach(item => {
    digest.update(item.uid);
    digest.update("|");
    digest.update(String(item.rank ?? ""));
    digest.update("|");
    digest.update(String(item.order ?? ""));
    digest.update("|");
    digest.update(String(item.score ?? ""));
    digest.update("|");
    digest.update(item.color || "");
    digest.update("\n");
  });
  return digest.digest("hex");
}

function rateMatch(entries, stateLookup) {
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
    const group = groups[groups.length - 1];
    const state = stateLookup.get(entry.uid) || createInitialState();
    group.push({
      entry,
      state,
      ratingBefore: new Rating(state.mu, state.sigma)
    });
  });

  const ratingGroups = groups.map(group =>
    group.map(info => info.ratingBefore)
  );

  if (ratingGroups.length <= 1) {
    const outcomes = new Map();
    const newStates = new Map();

    groups.forEach(group => {
      group.forEach(info => {
        const state = info.state;
        const ratingValue = conservativeRating(state.mu, state.sigma);
        const nextState = {
          version: RATING_STATE_VERSION,
          mu: state.mu,
          sigma: state.sigma,
          lastResultId: info.entry.resultId || null,
          lastPlayedAt: info.entry.playedAt || info.entry.date || null
        };
        outcomes.set(info.entry.uid, {
          ratingBefore: ratingValue,
          ratingAfter: ratingValue,
          muAfter: state.mu,
          sigmaAfter: state.sigma
        });
        newStates.set(info.entry.uid, nextState);
      });
    });

    return { outcomes, newStates };
  }

  const ratedGroups = ratingEnvironment.rate(ratingGroups);
  const outcomes = new Map();
  const newStates = new Map();

  groups.forEach((group, groupIndex) => {
    group.forEach((info, playerIndex) => {
      const updatedRating = ratedGroups[groupIndex][playerIndex];
      const beforeState = info.state;
      const afterMu = round(updatedRating.mu, INTERNAL_PRECISION);
      const afterSigma = round(updatedRating.sigma, INTERNAL_PRECISION);

      const ratingBefore = conservativeRating(
        beforeState.mu,
        beforeState.sigma
      );
      const ratingAfter = conservativeRating(afterMu, afterSigma);

      const nextState = {
        version: RATING_STATE_VERSION,
        mu: afterMu,
        sigma: afterSigma,
        lastResultId: info.entry.resultId || null,
        lastPlayedAt: info.entry.playedAt || info.entry.date || null
      };

      outcomes.set(info.entry.uid, {
        ratingBefore,
        ratingAfter,
        muAfter: afterMu,
        sigmaAfter: afterSigma
      });
      newStates.set(info.entry.uid, nextState);
    });
  });

  return { outcomes, newStates };
}

module.exports = {
  ratingEnvironment,
  RATING_STATE_VERSION,
  CONSERVATIVE_MULTIPLIER,
  createInitialState,
  conservativeRating,
  computePlayersHash,
  rateMatch
};
