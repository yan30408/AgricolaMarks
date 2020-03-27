import actions from "./actions";
import { db, FieldValue } from "initializer";
//import sendEvent from "modules/sendEvent";
import { createSubscribeCollection } from "../firestoreModuleUtils";
import { UserRecord } from "./records";

const usersRef = db.collection("users");

export const subscribeUsers = createSubscribeCollection(
  actions,
  (_, state) => usersRef
);

export const addUser = data => () => {
  if (!data) return null;
  return usersRef.doc(data.uid).set({
    ...UserRecord(data),
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
