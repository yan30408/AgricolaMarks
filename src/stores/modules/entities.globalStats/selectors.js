export const getGlobalStatsState = state =>
  state.entities.globalStats.byId || {};

export const getGlobalStatsSummary = state => {
  const stats = getGlobalStatsState(state);
  return stats.summary || null;
};
