import types from "./types";
import produce from "immer";
//import reduceReducer from "reduce-reducers";
//import { enableBatching } from "redux-batched-actions";
import { DEFAULT_GAME_MODE } from "Constants";

const { APP_STATE_MUTATE } = types;

const initialState = {
  uid: null,
  isAnonymous: null,
  isAdmin: false,
  gameMode: DEFAULT_GAME_MODE,

  currentOrder: 0,
  isOpenMenu: false,
  isOpenResult: false,
  isOpenSetup: false,
  isOpenAbout: false,
  isOpenAllClear: false,
  isOpenPlayerSelect: false,
  isOpenPlayerList: false,
  isOpenResultList: false,
  isOpenStatistics: false,

  resultDate: null,
  resultId: null
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
