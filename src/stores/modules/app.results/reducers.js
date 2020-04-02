import types from "./types";
import produce from "immer";
//import reduceReducer from "reduce-reducers";
//import { enableBatching } from "redux-batched-actions";
import { ScoreByRoomType } from "Constants";

export const defaultResult = {
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
      value: 2,
      score: 0,
      type: "Wood" /*Object.keys(ScoreByRoomType)[0] */
    },
    Family: { value: 2, score: 6 },
    Beggar: { value: 0, score: 0 },
    Improvement: { value: 0, score: 0 },
    // Bonus: { value: 14, score: 0 }
    Bonus: { value: 0, score: 0 }
  },
  score: {
    inFarm: -1,
    outside: 0,
    total: -1
  },
  uid: -1
};

const calculateResult = result => {
  let sum = 0;
  for (var key in result.category) {
    sum += result.category[key].score;
  }
  result.score.total = sum;
  result.score.outside =
    result.category["Improvement"].score + result.category["Bonus"].score;
  result.score.inFarm = result.score.total - result.score.outside;
};

// persistReducer を噛ませると、なぜか連想配列になってしまう
const initialState = Array(5).fill(defaultResult);

// Reducers
const appResultsReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.APP_RESULTS_INIT: {
      state = initialState;
      return state;
    }
    case types.APP_RESULTS_MUTATE: {
      return produce(state, draft => {
        action.mutate(draft);
        return draft;
      });
    }
    case types.APP_RESULTS_CHANGE_ROOM: {
      return produce(state, draft => {
        const room = draft[action.order].category["Rooms"];
        room.type = action.roomType;
        room.score = room.value * ScoreByRoomType[room.type];
        calculateResult(draft[action.order]);
        return draft;
      });
    }
    case types.APP_RESULTS_CHANGE_FIXED_SCORE_BUTTON: {
      return produce(state, draft => {
        const category = draft[action.order].category[action.id];
        category.value = action.value;
        category.score = action.value === 0 ? -1 : action.value;
        calculateResult(draft[action.order]);
        return draft;
      });
    }
    case types.APP_RESULTS_CHANGE_LINEAR_SCORE_BUTTON: {
      return produce(state, draft => {
        const category = draft[action.order].category[action.id];
        category.value = action.value;
        category.score = action.value * action.point;
        calculateResult(draft[action.order]);
        return draft;
      });
    }
    default: {
      return state;
    }
  }
};

export default appResultsReducer;
