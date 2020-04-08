import { createSelector } from "reselect";
import { includes } from "lodash";

export const getResults = state => {
  return state.entities.results.byId;
};

export const getResultById = (state, id) => {
  return state.entities.results.byId[id];
};

export const getResultIds = state => {
  return state.entities.results.allIds || [];
};

const getPropsUid = (_, props) => props.uid;
export const getPlayNum = createSelector(
  [getResults, getResultIds, getPropsUid],
  (results, ids, uid) => {
    return ids.filter(id => includes(results[id], uid)).length;
  }
);
