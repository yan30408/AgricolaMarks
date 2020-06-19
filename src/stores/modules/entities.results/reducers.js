import types from "./types";
import { combineReducers } from "redux";
import { createByIdReducer, createIndexReducer } from "../firestoreModuleUtils";
import { format } from "date-fns";
import produce from "immer";
import { enableBatching } from "redux-batched-actions";

const byId = createByIdReducer(types);
const allIds = createIndexReducer(types);

const getDailyKey = action => {
  const date = action.data.date;
  if (date) {
    const key = format(
      new Date(date.seconds * 1000 + date.nanoseconds / 1000000),
      "yyyy/MM/dd"
    );
    return key;
  }
  return null;
};

const dailyReducer = enableBatching((state = {}, action) => {
  switch (action.type) {
    case types.INIT: {
      return {};
    }
    case types.REMOVE: {
      const key = getDailyKey(action);
      if (key) {
        return produce(state, draft => {
          delete draft[key];
        });
      }
      return state;
    }
    case types.ADD:
    case types.UPDATE: {
      const key = getDailyKey(action);
      if (key) {
        return produce(state, draft => {
          if (!(`${key}` in draft)) {
            draft[key] = [];
          }
          if (!draft[key].includes(action.id)) {
            draft[key].push(action.id);
          }
        });
      }
      return state;
    }
    default: {
      return state;
    }
  }
});

export default combineReducers({
  byId,
  allIds,
  dailyReducer
});
