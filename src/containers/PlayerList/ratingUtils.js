const MS_PER_DAY = 24 * 60 * 60 * 1000;
// 最終プレイ日からの経過日数によって、レートに係数をかける
const DECAY_THRESHOLDS = [
  { maxDays: 90, factor: 1 },
  { maxDays: 180, factor: 0.85 },
  { maxDays: 365, factor: 0.7 },
  { maxDays: Infinity, factor: 0.5 }
];

const toMillis = value => {
  if (!value) {
    return null;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const direct = new Date(value).getTime();
    if (!Number.isNaN(direct)) {
      return direct;
    }
    const withZ = value.endsWith("Z") ? value : `${value}Z`;
    const fallback = new Date(withZ).getTime();
    return Number.isNaN(fallback) ? null : fallback;
  }
  if (typeof value === "object") {
    if (value.toMillis && typeof value.toMillis === "function") {
      return value.toMillis();
    }
    const seconds =
      value._seconds ?? value.seconds ?? value.sec ?? value.epochSeconds;
    const nanos = value._nanoseconds ?? value.nanoseconds ?? value.nanos ?? 0;
    if (typeof seconds === "number") {
      return seconds * 1000 + nanos / 1e6;
    }
  }
  return null;
};

export const computeDecayFactor = (lastPlayedAt, now = Date.now()) => {
  const millis = toMillis(lastPlayedAt);
  if (!millis || !Number.isFinite(millis)) {
    return 1;
  }
  const diff = Math.max(0, now - millis);
  if (diff === 0) {
    return 1;
  }
  const days = diff / MS_PER_DAY;
  const entry = DECAY_THRESHOLDS.find(({ maxDays }) => days <= maxDays);
  return entry ? entry.factor : 1;
};

export const getAdjustedRating = (modeStats, now = Date.now()) => {
  if (!modeStats || typeof modeStats.rating !== "number") {
    return null;
  }
  const factor = computeDecayFactor(modeStats.lastPlayedAt, now);
  return modeStats.rating * factor;
};

export const toEloRating = rawRating => {
  if (rawRating == null || !Number.isFinite(rawRating)) {
    return null;
  }
  return Math.round(rawRating * 40 + 1500);
};

export const formatAdjustedRating = adjustedRating => {
  const elo = toEloRating(adjustedRating);
  if (elo == null) {
    return "-";
  }
  return String(elo);
};
