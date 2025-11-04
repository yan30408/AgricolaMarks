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
// export const rdb = firebase.database();
export const auth = firebase.auth();
export const providers = {
  twitter: new firebase.auth.TwitterAuthProvider()
};
export const storage = firebase.storage();
export const functions = firebase.functions();
export const FieldValue = firebase.firestore.FieldValue;
export const Timestamp = firebase.firestore.Timestamp;

auth.useDeviceLanguage();
