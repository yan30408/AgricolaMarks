import actions from "./actions";
import { db } from "initializer";
//import sendEvent from "modules/sendEvent";
import { createSubscribeCollection } from "../firestoreModuleUtils";

const resultsRef = db.collection("results");

export const subscribeResults = createSubscribeCollection(
  actions,
  (_, state) => resultsRef
);

export const addResult = data => () => {
  if (!data) return null;
  return resultsRef.add({
    date: data.date,
    results: data.results,
    createdAt: Date.now()
  });
};

// export const deleteUserHistory = roomId => (dispatch, getState) => {
//   const uid = getState().app.state.uid;
//   if (!uid) return null;
//   return usersRef(uid)
//     .doc(roomId)
//     .delete();
// };
