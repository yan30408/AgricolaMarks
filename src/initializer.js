import firebase from "@firebase/app";
import "@firebase/firestore";
// import "@firebase/database";
import "@firebase/auth";
import "@firebase/storage";
import "@firebase/functions";

import config from "config/firebase";

firebase.initializeApp(config);

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
