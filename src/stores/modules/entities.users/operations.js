import actions from "./actions";
import { db, FieldValue } from "initializer";
//import sendEvent from "modules/sendEvent";
import { createSubscribeCollection } from "../firestoreModuleUtils";
import { UserRecord } from "./records";
import { appPlayersUpdateRecent } from "../app.players/operations";

const usersRef = db.collection("users");

export const subscribeUsers = createSubscribeCollection(
  actions,
  (_, state) => usersRef
);

// Create or Update
export const saveUser = data => () => {
  if (!data) return null;
  return usersRef
    .doc(data.uid)
    .get()
    .then(doc => {
      if (doc.exists) {
        return usersRef.doc(data.uid).update({
          ...data,
          updatedAt: Date.now()
        });
      } else {
        return usersRef.doc(data.uid).set({
          ...UserRecord(data),
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    });
};

export const addUser = data => (dispatch, _) => {
  if (!data) return null;
  return usersRef
    .add({
      ...UserRecord(data),
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    .then(docRef => {
      dispatch(appPlayersUpdateRecent([docRef.id]));
    });
};

export const updateUser = (uid, data) => () => {
  if (!data) return null;
  return usersRef.doc(uid).update({
    ...data,
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
