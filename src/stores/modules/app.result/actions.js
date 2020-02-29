import types from "./types";

const actions = {
  appResultMutate: mutate => {
    return {
      type: types.APP_RESULT_MUTATE,
      mutate
    };
  }
};

export default actions;
