import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
// import "firebase/compat/database";
import "firebase/compat/auth";
import "firebase/compat/storage";
import "firebase/compat/functions";

import config from "config/firebase";

if (!firebase.apps.length) {
  firebase.initializeApp(config);
}

export const db = firebase.firestore();
if (process.env.REACT_APP_USE_FIRESTORE_EMULATOR === "true") {
  db.useEmulator("localhost", 8080);
}
export const auth = firebase.auth();
if (process.env.REACT_APP_USE_AUTH_EMULATOR === "true") {
  auth.useEmulator("http://localhost:9099", { disableWarnings: true });
}
export const providers = {
  twitter: new firebase.auth.TwitterAuthProvider()
};
export const storage = firebase.storage();
export const functions = firebase.app().functions("asia-northeast1");
if (process.env.REACT_APP_USE_FUNCTIONS_EMULATOR === "true") {
  functions.useEmulator("localhost", 5001);
}
export const FieldValue = firebase.firestore.FieldValue;
export const Timestamp = firebase.firestore.Timestamp;
export const FieldPath = firebase.firestore.FieldPath;

auth.useDeviceLanguage();
