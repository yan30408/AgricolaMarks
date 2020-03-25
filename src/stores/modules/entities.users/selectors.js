import { createSelector } from "reselect";
import { getAppState } from "../app.state/selectors";

export const getUsers = state => {
  return state.entities.users.byId;
};

export const getUserById = (state, uid) => {
  return state.entities.users.byId[uid] || [];
};

export const getUserIds = state => {
  return state.entities.users.allIds || [];
};
