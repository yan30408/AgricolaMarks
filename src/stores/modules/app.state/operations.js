import actions from "./actions";
import { auth, providers } from "initializer";
import { getUserById } from "../entities.users/selectors";
import { createUser, updateUser } from "../entities.users/operations";

export const appStateMutate = actions.appStateMutate;

export const subscribeUserState = () => (dispatch, _) => {
  return auth.onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in.
      const uid = user.uid;
      const displayName = user.displayName;
      // var email = user.email;
      // var emailVerified = user.emailVerified;
      const photoUrl = user.photoURL;
      const isAnonymous = user.isAnonymous;
      // var providerData = user.providerData;
      dispatch(
        appStateMutate(draft => {
          draft.uid = uid;
          draft.isAnonymous = isAnonymous;
        })
      );
      dispatch(updateUser(uid, { displayName, photoUrl }));
    } else {
      auth.signInAnonymously(); // force login
      dispatch(
        appStateMutate(draft => {
          draft.uid = null;
          draft.isAnonymous = null;
        })
      );
    }
  });
};

export const signInWithTwitter = () => async (dispatch, getState) => {
  const result = await auth.signInWithPopup(providers.twitter);
  if (result.user && result.user.providerData[0]) {
    const state = getState();
    const user = getUserById(state, result.user.uid);
    if (user.displayName === null) {
      dispatch(
        createUser({
          uid: result.user.uid,
          displayName: result.user.providerData[0].displayName,
          photoUrl: result.user.providerData[0].photoURL,
          twitterId: result.additionalUserInfo.username
        })
      );
    }
    result.user.updateProfile({
      displayName: result.user.providerData[0].displayName,
      photoURL: result.user.providerData[0].photoURL
    });
  }
};

export const signOut = () => () => {
  auth.signOut();
};
