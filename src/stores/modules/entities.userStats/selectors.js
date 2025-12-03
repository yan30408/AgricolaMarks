export const getUserStatsState = state => state.entities.userStats.byId || {};

export const getUserStatsById = (state, uid) => {
  const stats = getUserStatsState(state);
  return stats[uid] || null;
};

export const getAllUserStats = state => {
  return getUserStatsState(state);
};

export const getUserResultIdsState = state =>
  state.entities.userStats.resultIdsByMode || {};

export const getUserResultIdsByMode = (state, uid, modeKey) => {
  if (!uid || !modeKey) return [];
  const resultState = getUserResultIdsState(state);
  return resultState[uid]?.[modeKey] || [];
};
