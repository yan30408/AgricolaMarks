import { createSelector } from "reselect";
import { getAppState } from "../app.state/selectors";
import { getAppRecentPlayers } from "../app.players/selectors";
import { uniq } from "lodash";
import { UserRecord } from "./records";

const emptyUser = UserRecord({
  displayName: null,
  photoUrl: null,
  twitterId: null,
  merged: false
});

export const getUsers = state => {
  return state.entities.users.byId;
};

export const getUserById = (state, uid) => {
  const user = state.entities.users.byId[uid] || emptyUser;
  if (!user.merged) {
    return user;
  } else {
    return state.entities.users.byId[user.merged] || emptyUser;
  }
};

export const getUserIds = state => {
  return state.entities.users.allIds || [];
};

export const getValidUserIds = createSelector(
  [getUserIds, getUsers],
  (ids, users) => {
    return ids.filter(id => !users[id].merged);
  }
);

const getUId = state => getAppState(state, "uid");

export const getRecentUserIds = createSelector(
  [getValidUserIds, getAppRecentPlayers, getUId],
  (ids, recentIds, uid) => {
    if (uid) {
      return uniq([uid, ...recentIds, ...ids]);
    } else {
      return uniq([...recentIds, ...ids]);
    }
  }
);

const getPropsSearchText = (_, props) => props.searchText;
export const getFiltterdUserIds = createSelector(
  [getUsers, getRecentUserIds, getPropsSearchText],
  (users, ids, searchText) => {
    if (searchText === "") return ids;
    return ids.filter(id => {
      return (
        users[id]?.displayName?.includes(searchText) ||
        users[id]?.twitterId?.includes(searchText)
      );
    });
  }
);

const getPropsUid = (_, props) => props.uid;
export const getMergedUserIds = createSelector(
  [getUsers, getUserIds, getPropsUid],
  (users, ids, uid) => {
    return ids.filter(id => users[id].merged === uid);
  }
);
