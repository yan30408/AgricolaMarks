import actions from "./actions";
import { appPlayersMutate, appPlayersUpdate } from "../app.players/operations";
import { appStateMutate } from "../app.state/operations";
import { getAppCurrentPlayerKey } from "../app.players/selectors";
import { getResultById } from "../entities.results/selectors";
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
      results[order].order = order;
      results[order].color = newPlayerKey;
    })
  );
};

export const appResultsApply = resultId => (dispatch, getState) => {
  const state = getState();
  const result = getResultById(state, resultId);

  dispatch(
    appStateMutate(state => {
      state.resultDate = result.date.toDate();
      state.resultId = resultId;
    })
  );
  dispatch(
    appPlayersMutate(players => {
      for (var index = 0; index < result.results.length; ++index) {
        players.current[result.results[index].color].uid =
          result.results[index].uid;
        players.current[result.results[index].color].order =
          result.results[index].order;
      }
    })
  );
  dispatch(appPlayersUpdate());
  dispatch(
    appResultsMutate(results => {
      for (var index = 0; index < result.results.length; ++index) {
        results[result.results[index].order] = result.results[index];
      }
    })
  );
};
