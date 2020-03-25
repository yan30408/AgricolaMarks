import actions from "./actions";
import { db, FieldValue } from "initializer";
import sendEvent from "modules/sendEvent";
import { createSubscribeCollection } from "../firestoreModuleUtils";

const usersRef = db.collection("users");

export const subscribeUsers = createSubscribeDocument(actions, usersRef);

export const addUser = player => () => {
  if (!player) return null;
  return usersRef.doc(player.uid).set({
    displayName: player.displayName,
    photoUrl: player.photoUrl,
    twitterId: player.twitterId,
    merged: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
};

// export const deleteUserHistory = roomId => (dispatch, getState) => {
//   const uid = getState().app.state.uid;
//   if (!uid) return null;
//   return usersRef(uid)
//     .doc(roomId)
//     .delete();
// };
