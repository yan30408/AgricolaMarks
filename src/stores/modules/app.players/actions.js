import types from "./types";

const actions = {
  appPlayersMutate: mutate => {
    return {
      type: types.APP_PLAYERS_MUTATE,
      mutate
    };
  }
};

export default actions;
