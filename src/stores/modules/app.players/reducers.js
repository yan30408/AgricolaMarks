import types from "./types";
import produce from "immer";
//import reduceReducer from "reduce-reducers";
//import { enableBatching } from "redux-batched-actions";
import { mapValues } from "lodash";
import { Colors } from "Constants";
import resultsTypes from "../app.results/types";

const initialState = {
  current: mapValues(Colors, color => {
    return {
      uid: null,
      color,
      order: null
    };
  }),
  recent: []
};

// Reducers

const appPlayersReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.APP_PLAYERS_MUTATE: {
      return produce(state, draft => {
        action.mutate(draft);
        return draft;
      });
    }
    case types.APP_PLAYERS_INIT: {
      return produce(state, draft => {
        draft.current = initialState.current;
        return draft;
      });
    }
    case resultsTypes.APP_RESULTS_INIT: {
      return produce(state, draft => {
        draft.current.forEach(player => {
          player.order = null;
        });
        return draft;
      });
    }
    default: {
      return state;
    }
  }
};

export default appPlayersReducer;
