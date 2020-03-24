import actions from "./actions";
import { auth, db, providers } from "initializer";

export const appStateMutate = actions.appStateMutate;

export const subscribeUserState = () => dispatch => {
  return auth.onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in.
      const uid = user.uid;
      const displayName = user.displayName;
      // var email = user.email;
      // var emailVerified = user.emailVerified;
      const photoURL = user.photoURL;
      const isAnonymous = user.isAnonymous;
      // var providerData = user.providerData;
      dispatch(
        appStateMutate(draft => {
          draft.uid = uid;
          draft.isAnonymous = isAnonymous;
          draft.displayName = displayName;
          draft.photoUrl = photoURL;
        })
      );
    } else {
      auth.signInAnonymously(); // force login
      dispatch(
        appStateMutate(draft => {
          draft.uid = null;
          draft.isAnonymous = null;
          draft.displayName = null;
          draft.photoUrl = null;
        })
      );
    }
  });
};

export const signInWithTwitter = () => async () => {
  const result = await auth.signInWithPopup(providers.twitter);
  if (result.user && result.user.providerData[0]) {
    result.user.updateProfile({
      displayName: result.user.providerData[0].displayName,
      photoURL: result.user.providerData[0].photoURL
    });
  }
};

export const signOut = () => () => {
  auth.signOut();
};
