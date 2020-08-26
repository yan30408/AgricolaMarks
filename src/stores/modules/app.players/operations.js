import actions from "./actions";

export const appPlayersMutate = actions.appPlayersMutate;
export const appPlayersInit = actions.appPlayersInit;
export const appPlayersSet = actions.appPlayersSet;
export const appPlayersUpdateRecent = actions.appPlayersUpdateRecent;

export const appPlayersUpdate = () => (dispatch, getState) => {
  dispatch(actions.appPlayersUpdate(getState()));
};
