import types from "./types";
import produce, { setAutoFreeze, Draft } from "immer";
//import reduceReducer from "reduce-reducers";
//import { enableBatching } from "redux-batched-actions";

const { APP_STATE_MUTATE } = types;

//setAutoFreeze(false);

const initialState = {
  currentPlayer: 0,
  isOpenResult: false,
  isOpenSetup: false,
  isOpenAbout: false
};

// Reducers

const appStateReducer = (state = initialState, action) => {
  switch (action.type) {
    case APP_STATE_MUTATE: {
      // return Object.assign({}, state, action.mutate);
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
