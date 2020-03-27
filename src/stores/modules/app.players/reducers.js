import types from "./types";
import produce from "immer";
//import reduceReducer from "reduce-reducers";
//import { enableBatching } from "redux-batched-actions";
import { mapValues, find, uniq } from "lodash";
import { Colors } from "Constants";

const initialState = {
  current: mapValues(Colors, color => {
    return {
      uid: null,
      color
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
    case types.APP_PLAYERS_SET: {
      return produce(state, draft => {
        console.log(action);
        const prestate = find(
          draft.current,
          player => player.uid === action.uid
        );
        console.log(prestate);
        if (prestate) {
          prestate.uid = null;
        }
        if (action.cid in draft.current) {
          draft.current[action.cid].uid = action.uid;
        }
        return draft;
      });
    }
    case types.APP_PLAYERS_UPDATE_RECENT: {
      return produce(state, draft => {
        draft.recent = uniq([...action.players, ...draft.recent]);
        return draft;
      });
    }
    default: {
      return state;
    }
  }
};

export default appPlayersReducer;
