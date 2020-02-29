import { createSelector } from "reselect";

export const getAppPlayers = (state, key) => {
  return state.app.players[key];
};

export const getAppCurrentPlayer = (state, index) => {
  return state.app.players.current[index];
};

export const getAppCurrentPlayers = state => {
  return state.app.players.current;
};

export const getAppRecentPlayers = state => {
  return state.app.players.recent;
};

export const getValidPlayers = createSelector(getAppCurrentPlayers, players => {
  return players.filter(player => player.name !== null && player.name !== "");
});

export const getSortedResult = createSelector(getValidPlayers, players => {
  return players.sort((a, b) => {
    if (a.result.score.total < b.result.score.total) {
      return 1;
    } else {
      return -1;
    }
  });
});
