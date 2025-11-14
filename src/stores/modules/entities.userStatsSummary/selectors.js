export const getUserStatsSummaryState = state =>
  state.entities.userStatsSummary?.byId || {};

export const getUserStatsSummaryById = (state, uid) => {
  const summaries = getUserStatsSummaryState(state);
  return summaries[uid] || null;
};

export const getAllUserStatsSummary = state => {
  return getUserStatsSummaryState(state);
};
