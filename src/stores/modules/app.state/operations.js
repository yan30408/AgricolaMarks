import actions from "./actions";
import { auth, providers } from "initializer";
import { saveUser } from "../entities.users/operations";
import { DEFAULT_GAME_MODE } from "Constants";

export const appStateMutate = actions.appStateMutate;

export const subscribeUserState = () => dispatch => {
  let unsubscribeTokenListener = null;

  const detachTokenListener = () => {
    if (typeof unsubscribeTokenListener === "function") {
      unsubscribeTokenListener();
      unsubscribeTokenListener = null;
    }
  };

  const updateAdminFlag = async user => {
    if (!user) {
      dispatch(
        appStateMutate(draft => {
          draft.isAdmin = false;
        })
      );
      return;
    }
    try {
      const token = await user.getIdTokenResult();
      const isAdmin = Boolean(token?.claims?.admin);
      dispatch(
        appStateMutate(draft => {
          draft.isAdmin = isAdmin;
        })
      );
    } catch (error) {
      console.error("Failed to read custom claims", error);
      dispatch(
        appStateMutate(draft => {
          draft.isAdmin = false;
        })
      );
    }
  };

  const attachTokenListener = user => {
    detachTokenListener();
    if (!user) {
      dispatch(
        appStateMutate(draft => {
          draft.isAdmin = false;
        })
      );
      return;
    }
    unsubscribeTokenListener = auth.onIdTokenChanged(async currentUser => {
      if (!currentUser) {
        dispatch(
          appStateMutate(draft => {
            draft.isAdmin = false;
          })
        );
        return;
      }
      await updateAdminFlag(currentUser);
    });
    updateAdminFlag(user);
  };

  const unsubscribe = auth.onAuthStateChanged(function(user) {
    if (user) {
      const uid = user.uid;
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
      attachTokenListener(user);
      getRedirectResult(dispatch);
    } else {
      detachTokenListener();
      dispatch(
        appStateMutate(draft => {
          draft.uid = null;
          draft.isAnonymous = true;
          draft.isAdmin = false;
          draft.gameMode = DEFAULT_GAME_MODE;
        })
      );
    }
  });
  return () => {
    detachTokenListener();
    unsubscribe();
  };
};

const getRedirectResult = async dispatch => {
  try {
    const result = await auth.getRedirectResult();
    if (!result || !result.user) {
      return;
    }

    const profile = result.user.providerData?.[0];
    if (!profile) {
      return;
    }

    const twitterId =
      result.additionalUserInfo?.username || profile.screenName || null;

    if (profile.displayName || profile.photoURL) {
      await result.user.updateProfile({
        displayName: profile.displayName || result.user.displayName,
        photoURL: profile.photoURL || result.user.photoURL
      });
    }

    dispatch(
      saveUser({
        uid: result.user.uid,
        displayName: profile.displayName || result.user.displayName,
        photoUrl: profile.photoURL || result.user.photoURL,
        twitterId
      })
    );
  } catch (error) {
    console.error("Failed to handle redirect result", error);
  }
};

export const signInWithTwitter = () => async () => {
  try {
    const result = await auth.getRedirectResult();
    if (result && result.user && result.user.providerData?.[0]) {
      const profile = result.user.providerData[0];
      await result.user.updateProfile({
        displayName: profile.displayName || result.user.displayName,
        photoURL: profile.photoURL || result.user.photoURL
      });
      return;
    }
    return auth.signInWithRedirect(providers.twitter);
  } catch (error) {
    console.error("Twitter sign-in failed", error);
    throw error;
  }
};

export const signOut = () => () => {
  auth.signOut();
};
