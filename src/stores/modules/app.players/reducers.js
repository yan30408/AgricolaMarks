import types from "./types";
import produce from "immer";
//import reduceReducer from "reduce-reducers";
//import { enableBatching } from "redux-batched-actions";
import { mapValues, find, uniq, forEach } from "lodash";
import { Colors } from "Constants";
import resultsTypes from "../app.results/types";
import { getUserById } from "../entities.users/selectors";

const initialState = {
  current: mapValues(Colors, (_, colorId) => {
    return {
      uid: null,
      name: null,
      iconUrl: null,
      order: -1,
      color: colorId
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
    case types.APP_PLAYERS_UPDATE: {
      return produce(state, draft => {
        forEach(draft.current, player => {
          const user = getUserById(action.state, player.uid);
          if (user.displayName) {
            player.name = user.displayName;
            player.iconUrl = user.photoUrl;
          }
        });
        return draft;
      });
    }
    case types.APP_PLAYERS_SET: {
      return produce(state, draft => {
        const user = action.user;
        const prestate = find(
          draft.current,
          player => player.uid && player.uid === user._id
        );
        if (prestate) {
          prestate.uid = null;
          prestate.name = null;
          prestate.iconUrl = null;
          prestate.order = -1;
        }
        if (action.cid in draft.current) {
          const player = draft.current[action.cid];
          player.uid = user._id;
          player.name = user.displayName;
          player.iconUrl = user.photoUrl;
          player.order = -1;
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
    case resultsTypes.APP_RESULTS_INIT: {
      return produce(state, draft => {
        forEach(draft.current, player => {
          player.order = -1;
        });
      });
    }
    default: {
      return state;
    }
  }
};

export default appPlayersReducer;
