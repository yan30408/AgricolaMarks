import { combineReducers } from "redux";
import { createByIdReducer, createIndexReducer } from "../firestoreModuleUtils";
import types from "./types";

const byId = createByIdReducer(types);
const allIds = createIndexReducer(types);

const resultIdsByMode = (state = {}, action = {}) => {
  switch (action.type) {
    case types.SET_RESULT_IDS: {
      const { uid, modeKey, resultIds } = action.payload || {};
      if (!uid || !modeKey || !Array.isArray(resultIds)) {
        return state;
      }
      const existing = state[uid] || {};
      if (
        existing[modeKey] &&
        existing[modeKey].length === resultIds.length &&
        existing[modeKey].every((id, index) => id === resultIds[index])
      ) {
        return state;
      }
      return {
        ...state,
        [uid]: {
          ...existing,
          [modeKey]: resultIds
        }
      };
    }
    case types.CLEAR_RESULT_IDS: {
      const { uid, modeKey } = action.payload || {};
      if (!uid) {
        return state;
      }
      const existing = state[uid];
      if (!existing) {
        return state;
      }
      if (modeKey) {
        if (!existing[modeKey]) {
          return state;
        }
        const nextModes = { ...existing };
        delete nextModes[modeKey];
        if (Object.keys(nextModes).length === 0) {
          const nextState = { ...state };
          delete nextState[uid];
          return nextState;
        }
        return {
          ...state,
          [uid]: nextModes
        };
      }
      const nextState = { ...state };
      delete nextState[uid];
      return nextState;
    }
    case types.REMOVE: {
      const { id } = action;
      if (!id || !state[id]) {
        return state;
      }
      const nextState = { ...state };
      delete nextState[id];
      return nextState;
    }
    case types.INIT: {
      return {};
    }
    default:
      return state;
  }
};

export default combineReducers({
  byId,
  allIds,
  resultIdsByMode
});
