import types from "./types";

const actions = {
  appPlayersMutate: mutate => {
    return {
      type: types.APP_PLAYERS_MUTATE,
      mutate
    };
  },
  appPlayersInit: { type: types.APP_PLAYERS_INIT }
};

export default actions;
