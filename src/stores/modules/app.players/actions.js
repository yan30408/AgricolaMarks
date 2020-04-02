import types from "./types";

const actions = {
  appPlayersMutate: mutate => {
    return {
      type: types.APP_PLAYERS_MUTATE,
      mutate
    };
  },
  appPlayersInit: { type: types.APP_PLAYERS_INIT },
  appPlayersSet: (cid, user) => {
    return {
      type: types.APP_PLAYERS_SET,
      cid,
      user
    };
  },
  appPlayersUpdateRecent: players => {
    return {
      type: types.APP_PLAYERS_UPDATE_RECENT,
      players
    };
  }
};

export default actions;
