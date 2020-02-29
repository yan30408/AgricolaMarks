import types from "./types";
//import produce, { setAutoFreeze, Draft } from "immer";
//import reduceReducer from "reduce-reducers";
//import { enableBatching } from "redux-batched-actions";
import { Colors } from "Constants";

const { APP_PLAYERS_MUTATE } = types;

//setAutoFreeze(false);

const initialState = {
  current: Array(5)
    .fill(0)
    .map((_, index) => {
      return {
        id: index,
        name: null,
        color: Colors[Object.keys(Colors)[index]],
        order: null,
        result: {
          category: {
            Fields: { value: 0, score: -1 },
            Pastures: { value: 0, score: -1 },
            Grain: { value: 0, score: -1 },
            Vegetables: { value: 0, score: -1 },
            Sheep: { value: 0, score: -1 },
            "Wild boar": { value: 0, score: -1 },
            Cattle: { value: 0, score: -1 },
            "Unused Spaces": { value: 0, score: 0 },
            Stable: { value: 0, score: 0 },
            Rooms: {
              value: 0,
              score: 0,
              type: "Wood" /*Object.keys(ScoreByRoomType)[0] */
            },
            Family: { value: 0, score: 6 },
            Beggar: { value: 0, score: 0 },
            Improvement: { value: 0, score: 0 },
            Bonus: { value: 14, score: 0 }
          },
          score: {
            inFarm: -1,
            outside: 0,
            total: -1
          }
        }
      };
    }),
  recent: []
};

// Reducers

const appPlayersReducer = (state = initialState, action) => {
  switch (action.type) {
    case APP_PLAYERS_MUTATE: {
      return Object.assign({}, state, action.mutate);
      //   return produce(state, draft => {
      //     action.mutate(draft);
      //     return draft;
      //   });
    }
    default: {
      return state;
    }
  }
};

export default appPlayersReducer;
