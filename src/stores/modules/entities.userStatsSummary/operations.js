import actions from "./actions";
import { db } from "initializer";

const KNOWN_MODES = new Set([
  "classic",
  "classicMoor",
  "revised",
  "revisedMoor"
]);

const getSummaryState = (getState, uid) =>
  getState()?.entities?.userStatsSummary?.byId?.[uid] || null;

const createEmptySummaryPayload = () => ({
  modes: {},
  colorCounts: {},
  favoriteColor: null,
  updatedAt: null
});

const buildAllowedModes = requestedModes => {
  if (!Array.isArray(requestedModes) || requestedModes.length === 0) {
    return null;
  }
  const filtered = requestedModes.filter(mode => KNOWN_MODES.has(mode));
  return filtered.length > 0 ? filtered : null;
};

const buildModesPayload = (data, allowedModes) => {
  const rawModes =
    data.modes && typeof data.modes === "object" ? data.modes : {};
  const modeFilter = allowedModes ? new Set(allowedModes) : null;
  const sanitized = {};
  Object.entries(rawModes).forEach(([modeKey, value]) => {
    if (modeFilter && !modeFilter.has(modeKey)) {
      return;
    }
    sanitized[modeKey] = sanitizeModeSummary(value);
  });
  return sanitized;
};

const mergeSummaryState = (
  dispatch,
  getState,
  uid,
  payload,
  allowedModes = null
) => {
  const previous = getSummaryState(getState, uid) || {};
  const previousModes = previous.modes || {};

  let modes;
  if (allowedModes) {
    const merged = { ...previousModes };
    allowedModes.forEach(modeKey => {
      if (payload.modes[modeKey]) {
        merged[modeKey] = payload.modes[modeKey];
      } else {
        delete merged[modeKey];
      }
    });
    modes = merged;
  } else {
    modes = payload.modes;
  }

  dispatch(
    actions.update(uid, {
      ...previous,
      ...payload,
      modes
    })
  );
};

export const fetchUserStatsSummaryById = (
  uid,
  { modes: requestedModes } = {}
) => async (dispatch, getState) => {
  if (!uid) return;

  const allowedModes = buildAllowedModes(requestedModes);

  const doc = await db
    .collection("users")
    .doc(uid)
    .collection("statsSummary")
    .doc("modes")
    .get();

  if (!doc.exists) {
    dispatch(actions.update(uid, createEmptySummaryPayload()));
    return;
  }

  const data = doc.data() || {};
  const payload = {
    modes: buildModesPayload(data, allowedModes),
    colorCounts: sanitizeColorCounts(data.colorCounts),
    favoriteColor:
      typeof data.favoriteColor === "string" ? data.favoriteColor : null,
    updatedAt: data.updatedAt || null
  };

  mergeSummaryState(dispatch, getState, uid, payload, allowedModes);
};

export const subscribeUserStatsSummaryById = (
  uid,
  { modes: requestedModes } = {}
) => (dispatch, getState) => {
  if (!uid) return () => {};

  const allowedModes = buildAllowedModes(requestedModes);

  const docRef = db
    .collection("users")
    .doc(uid)
    .collection("statsSummary")
    .doc("modes");

  const unsubscribe = docRef.onSnapshot(
    doc => {
      if (!doc.exists) {
        dispatch(actions.update(uid, createEmptySummaryPayload()));
        return;
      }
      const data = doc.data() || {};
      const payload = {
        modes: buildModesPayload(data, allowedModes),
        colorCounts: sanitizeColorCounts(data.colorCounts),
        favoriteColor:
          typeof data.favoriteColor === "string" ? data.favoriteColor : null,
        updatedAt: data.updatedAt || null
      };

      mergeSummaryState(dispatch, getState, uid, payload, allowedModes);
    },
    error => {
      console.error("Failed to subscribe user stats summary", error);
    }
  );

  return () => {
    unsubscribe();
  };
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
