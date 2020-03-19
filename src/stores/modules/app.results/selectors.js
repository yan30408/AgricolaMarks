import { createSelector } from "reselect";
import { defaultResult } from "./reducers";

export const getAppResults = state => {
  return state.app.results;
};

export const getAppResultByIndex = (state, index) => {
  return state.app.results[index] || defaultResult;
};

export const getSortedResult = createSelector(getAppResults, results => {
  return Object.keys(results)
    .map(key => results[key])
    .filter(result => "id" in result && result.id !== -1)
    .sort((a, b) => {
      if (a.score.total < b.score.total) {
        return 1;
      } else {
        return -1;
      }
    });
});
