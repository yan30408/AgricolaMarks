import { createSelector } from "reselect";
import { defaultResult } from "./reducers";
import { toArray } from "lodash";

// persistReducer を噛ませると、なぜか連想配列になってしまうので変換
export const getAppResults = state => {
  return toArray(state.app.results).slice(0, 5);
};

export const getAppResultByIndex = (state, index) => {
  return state.app.results[index] || defaultResult;
};

export const getSortedResult = createSelector(getAppResults, results => {
  return results
    .filter(result => result.uid !== -1)
    .sort((a, b) => b.score.total - a.score.total);
});
