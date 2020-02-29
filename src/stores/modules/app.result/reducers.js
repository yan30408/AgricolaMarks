import types from "./types";
//import produce, { setAutoFreeze, Draft } from "immer";
//import reduceReducer from "reduce-reducers";
//import { enableBatching } from "redux-batched-actions";

const { APP_RESULT_MUTATE } = types;

//setAutoFreeze(false);

const initialState = Array(5)
  .fill(0)
  .map(() => {
    return {
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
      },
      id: -1
    };
  });

// Reducers

const appResultReducer = (state = initialState, action) => {
  switch (action.type) {
    case APP_RESULT_MUTATE: {
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

export default appResultReducer;
