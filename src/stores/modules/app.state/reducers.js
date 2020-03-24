import types from "./types";
import produce from "immer";
//import reduceReducer from "reduce-reducers";
//import { enableBatching } from "redux-batched-actions";

const { APP_STATE_MUTATE } = types;

const initialState = {
  uid: null,
  isAnonymous: null,
  displayName: null,
  photoUrl: null,

  currentPlayerId: -1,
  currentOrder: 0,
  isOpenMenu: false,
  isOpenResult: false,
  isOpenSetup: false,
  isOpenAbout: false,
  isOpenAllClear: false
};

// Reducers

const appStateReducer = (state = initialState, action) => {
  switch (action.type) {
    case APP_STATE_MUTATE: {
      return produce(state, draft => {
        action.mutate(draft);
        return draft;
      });
    }
    default: {
      return state;
    }
  }
};

export default appStateReducer;
