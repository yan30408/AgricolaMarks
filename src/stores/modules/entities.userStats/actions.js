import { createActions } from "../firestoreModuleUtils";
import types from "./types";

const baseActions = createActions(types);

const extraActions = {
  setResultIds(uid, modeKey, resultIds) {
    return {
      type: types.SET_RESULT_IDS,
      payload: {
        uid,
        modeKey,
        resultIds
      }
    };
  },
  clearResultIds(uid, modeKey = null) {
    return {
      type: types.CLEAR_RESULT_IDS,
      payload: {
        uid,
        modeKey
      }
    };
  }
};

export default {
  ...baseActions,
  ...extraActions
};
