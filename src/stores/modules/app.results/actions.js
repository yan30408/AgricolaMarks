import types from "./types";

const actions = {
  appResultsMutate: mutate => {
    return {
      type: types.APP_RESULTS_MUTATE,
      mutate
    };
  },
  appResultsInit: { type: types.APP_RESULTS_INIT },
  appResultsChangeRoom: (order, roomType) => {
    return {
      type: types.APP_RESULTS_CHANGE_ROOM,
      order,
      roomType
    };
  },
  appResultsChangeFixedScoreButton: (order, id, value) => {
    return {
      type: types.APP_RESULTS_CHANGE_FIXED_SCORE_BUTTON,
      order,
      id,
      value
    };
  },
  appResultsChangeLinearScoreButton: (order, id, value, point) => {
    return {
      type: types.APP_RESULTS_CHANGE_LINEAR_SCORE_BUTTON,
      order,
      id,
      value,
      point
    };
  }
};

export default actions;
