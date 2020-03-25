import { createSelector } from "reselect";
import { findIndex } from "lodash";

export const getAppPlayers = (state, key) => {
  return state.app.players[key];
};

export const getAppCurrentPlayer = (state, index) => {
  return state.app.players.current[index];
};

export const getAppCurrentPlayerById = (state, id) => {
  return []; //state.app.players.current.find(player => player.id === id);
};

export const getAppCurrentPlayerIndex = (state, cid) => {
  return findIndex(state.app.players.current, { colorId: cid });
};

export const getAppCurrentPlayers = state => {
  return state.app.players.current;
};

export const getAppRecentPlayers = state => {
  return state.app.players.recent;
};

export const getValidPlayers = createSelector(getAppCurrentPlayers, players => {
  return []; //players.filter(player => player.name !== "");
});
