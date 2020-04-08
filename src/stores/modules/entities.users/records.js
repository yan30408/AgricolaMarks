export const UserRecord = user => {
  return {
    displayName: user.displayName || null,
    photoUrl: user.photoUrl || null,
    twitterId: user.twitterId || null,
    createdBy: user.createdBy || null,
    merged: false
  };
};
