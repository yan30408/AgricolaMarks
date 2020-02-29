import { createSelector } from "reselect";

export const getAppResult = state => {
  return state.app.result || [];
};

export const getAppResultByIndex = (state, index) => {
  return state.app.result[index];
};

export const getSortedResult = createSelector(getAppResult, result => {
  console.log(result);
  return result
    .filter(playerResult => playerResult.id !== -1)
    .sort((a, b) => {
      if (a.score.total < b.score.total) {
        return 1;
      } else {
        return -1;
      }
    });
});
