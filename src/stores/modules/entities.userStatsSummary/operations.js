import actions from "./actions";
import { db } from "initializer";

const KNOWN_MODES = new Set([
  "classic",
  "classicMoor",
  "revised",
  "revisedMoor"
]);

export const fetchUserStatsSummaryById = (
  uid,
  { modes: requestedModes } = {}
) => async dispatch => {
  if (!uid) return;

  const doc = await db
    .collection("users")
    .doc(uid)
    .collection("statsSummary")
    .doc("modes")
    .get();

  if (!doc.exists) {
    dispatch(
      actions.update(uid, {
        modes: {},
        updatedAt: null
      })
    );
    return;
  }

  const data = doc.data() || {};
  const rawModes =
    data.modes && typeof data.modes === "object" ? data.modes : {};
  const allowedModes =
    Array.isArray(requestedModes) && requestedModes.length
      ? requestedModes.filter(mode => KNOWN_MODES.has(mode))
      : null;

  const modes = {};
  Object.entries(rawModes).forEach(([modeKey, value]) => {
    if (allowedModes && !allowedModes.includes(modeKey)) {
      return;
    }
    modes[modeKey] = sanitizeModeSummary(value);
  });

  const colorCounts = sanitizeColorCounts(data.colorCounts);
  const favoriteColor =
    typeof data.favoriteColor === "string" ? data.favoriteColor : null;

  const payload = {
    modes,
    colorCounts,
    favoriteColor,
    updatedAt: data.updatedAt || null
  };

  dispatch(actions.update(uid, payload));
};

function sanitizeModeSummary(value) {
  const summary = value && typeof value === "object" ? { ...value } : {};
  summary.playCount = Number.isFinite(summary.playCount)
    ? summary.playCount
    : 0;
  summary.scoreTotal = Number.isFinite(summary.scoreTotal)
    ? summary.scoreTotal
    : 0;
  summary.rating =
    typeof summary.rating === "number" && Number.isFinite(summary.rating)
      ? summary.rating
      : null;
  summary.sigma = sanitizeSigmaValue(summary);
  summary.highestScore =
    summary.highestScore && typeof summary.highestScore === "object"
      ? {
          resultId: summary.highestScore.resultId || null,
          score: Number(summary.highestScore.score) || 0,
          playedAt: summary.highestScore.playedAt || null
        }
      : null;
  summary.lowestScore =
    summary.lowestScore && typeof summary.lowestScore === "object"
      ? {
          resultId: summary.lowestScore.resultId || null,
          score: Number(summary.lowestScore.score) || 0,
          playedAt: summary.lowestScore.playedAt || null
        }
      : null;
  summary.updatedAt = summary.updatedAt || null;
  return summary;
}

function sanitizeSigmaValue(summary) {
  const direct = Number(summary?.sigma);
  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }
  const legacy = Number(summary?.ratingSigma);
  if (Number.isFinite(legacy) && legacy > 0) {
    return legacy;
  }
  return null;
}

function sanitizeColorCounts(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const sanitized = {};
  Object.entries(value).forEach(([color, count]) => {
    const numeric = Math.round(Number(count) || 0);
    if (numeric > 0) {
      sanitized[color] = numeric;
    }
  });
  return sanitized;
}
