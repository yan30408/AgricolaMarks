export const getUserStatsState = state => state.entities.userStats.byId || {};

export const getUserStatsById = (state, uid) => {
  const stats = getUserStatsState(state);
  return stats[uid] || null;
};

export const getAllUserStats = state => {
  return getUserStatsState(state);
};
