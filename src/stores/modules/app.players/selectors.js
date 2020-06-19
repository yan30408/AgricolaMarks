import { createSelector } from "reselect";
import { filter, find, findKey } from "lodash";

export const getAppPlayers = (state, key) => {
  return state.app.players[key];
};

export const getAppCurrentPlayer = (state, key) => {
  return state.app.players.current[key];
};

export const getAppCurrentPlayerById = (state, uid) => {
  return find(
    state.app.players.current,
    player => player.uid && player.uid === uid
  );
};

// PlayerKey は "Red", "Blue" などの color id
export const getAppCurrentPlayerKey = (state, uid) => {
  return findKey(
    state.app.players.current,
    player => player.uid && player.uid === uid
  );
};

export const getAppCurrentPlayers = state => {
  return state.app.players.current;
};

export const getAppRecentPlayers = state => {
  return state.app.players.recent;
};

export const getValidPlayers = createSelector(getAppCurrentPlayers, players => {
  return filter(players, player => player.uid);
});
