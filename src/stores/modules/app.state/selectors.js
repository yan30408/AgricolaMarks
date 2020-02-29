//import { createSelector } from "reselect";

export const getAppState = (state, name) => {
  return state.app.state[name];
};
