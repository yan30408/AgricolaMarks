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

export const updateResult = (id, data) => () => {
  if (!data) return null;
  return resultsRef.doc(id).update({
    date: data.date,
    results: data.results,
    updatedAt: Date.now()
  });
};

export const deleteResult = id => () => {
  // return resultsRef.doc(id).update({
  //   archived: true,
  //   updatedAt: Date.now()
  // });
  // const batch = db.batch();
  // batch.delete(resultsRef.doc(id));
  // return batch.commit();

  return resultsRef.doc(id).delete();
};

// export const convertResult = (id, data) => () => {
//   if (!data) return null;
//   return resultsRef.doc(id).update({archived: false});
// };
