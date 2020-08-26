import actions from "./actions";
import { auth, providers } from "initializer";
import { saveUser } from "../entities.users/operations";

export const appStateMutate = actions.appStateMutate;

export const subscribeUserState = () => (dispatch, _) => {
  const unsubscribe = auth.onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in.
      const uid = user.uid;
      // const displayName = user.displayName;
      // var email = user.email;
      // var emailVerified = user.emailVerified;
      // const photoUrl = user.photoURL;
      const isAnonymous = user.isAnonymous;
      const providerData = user.providerData;
      if (providerData[0]?.displayName) {
        user.updateProfile({
          displayName: providerData[0].displayName,
          photoURL: providerData[0].photoURL
        });
      }
      dispatch(
        appStateMutate(draft => {
          draft.uid = uid;
          draft.isAnonymous = isAnonymous;
        })
      );
      getRedirectResult(dispatch);
    } else {
      //auth.signInAnonymously(); // force login
      dispatch(
        appStateMutate(draft => {
          draft.uid = null;
          draft.isAnonymous = true;
        })
      );
    }
  });
  return () => unsubscribe();
};

const getRedirectResult = async dispatch => {
  const result = await auth.getRedirectResult();
  if (result && result.user && result.user.providerData[0]) {
    dispatch(
      saveUser({
        uid: result.user.uid,
        displayName: result.user.providerData[0].displayName,
        photoUrl: result.user.providerData[0].photoURL,
        twitterId: result.additionalUserInfo.username
      })
    );
  }
};

export const signInWithTwitter = () => async () => {
  const result = await auth.getRedirectResult();
  if (result && result.user && result.user.providerData[0]) {
    result.user.updateProfile({
      displayName: result.user.providerData[0].displayName,
      photoURL: result.user.providerData[0].photoURL
    });
  } else {
    auth.signInWithRedirect(providers.twitter);
  }
};

export const signOut = () => () => {
  auth.signOut();
};
