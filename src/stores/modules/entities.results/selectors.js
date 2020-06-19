import { createSelector } from "reselect";
import { includes, forEach } from "lodash";

export const getResults = state => {
  return state.entities.results.byId;
};

export const getResultById = (state, id) => {
  return state.entities.results.byId[id];
};

export const getResultIds = state => {
  return state.entities.results.allIds || [];
};

export const getDailyResultIds = state => {
  return state.entities.results.dailyReducer;
};

const getPropsUid = (_, props) => props.uid;
export const getPlayNum = createSelector(
  [getResults, getResultIds, getPropsUid],
  (results, ids, uid) => {
    return ids.filter(id => includes(results[id], uid)).length;
  }
);

export const getSortedDailyResultIds = createSelector(
  [getResults, getDailyResultIds],
  (results, dailyResultIds) => {
    forEach(dailyResultIds, (_, key) => {
      dailyResultIds[key].sort(
        (a, b) => results[b].date.seconds - results[a].date.seconds
      );
    });
    return dailyResultIds;
  }
);
