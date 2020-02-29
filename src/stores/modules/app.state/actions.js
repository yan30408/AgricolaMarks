import types from "./types";

const actions = {
  appStateMutate: mutate => {
    return {
      type: types.APP_STATE_MUTATE,
      mutate
    };
  }
};

export default actions;
