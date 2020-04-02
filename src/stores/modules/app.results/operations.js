import actions from "./actions";
import { appPlayersMutate } from "../app.players/operations";
import { getAppCurrentPlayerKey } from "../app.players/selectors";
import { getAppResultByIndex } from "./selectors";

export const appResultsMutate = actions.appResultsMutate;
export const appResultsInit = actions.appResultsInit;
export const appResultsChangeRoom = actions.appResultsChangeRoom;
export const appResultsChangeFixedScoreButton =
  actions.appResultsChangeFixedScoreButton;
export const appResultsChangeLinearScoreButton =
  actions.appResultsChangeLinearScoreButton;

export const appResultsSetPlayer = (uid, order) => (dispatch, getState) => {
  const state = getState();
  const result = getAppResultByIndex(state, order);
  const oldPlayerKey = getAppCurrentPlayerKey(state, result.uid);
  const newPlayerKey = getAppCurrentPlayerKey(state, uid);

  dispatch(
    appPlayersMutate(players => {
      if (oldPlayerKey) players.current[oldPlayerKey].order = -1;
      if (newPlayerKey) players.current[newPlayerKey].order = order;
    })
  );
  dispatch(
    appResultsMutate(results => {
      results[order].uid = uid;
    })
  );
};
