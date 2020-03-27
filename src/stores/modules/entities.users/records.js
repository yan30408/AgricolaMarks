export const UserRecord = user => {
  return {
    displayName: user.displayName || null,
    photoUrl: user.photoUrl || null,
    twitterId: user.twitterId || null,
    madeBy: user.madeBy || null,
    merged: false
  };
};
