import { createSelector } from "reselect";
import { includes, forEach } from "lodash";
import { getUserIds } from "../entities.users/selectors";

export const getResults = state => {
  return state.entities.results.byId;
};

export const getResultById = (state, id) => {
  return state.entities.results.byId[id];
};

export const getResultIds = state => {
  return state.entities.results.allIds || [];
};

export const getDailyResultIds = state => {
  return state.entities.results.dailyReducer;
};

export const getUserlyResultIds = state => {
  return state.entities.results.userlyReducer;
};

const getPropsUid = (_, props) => props.uid;
export const getPlayNum = createSelector(
  [getResults, getResultIds, getPropsUid],
  (results, ids, uid) => {
    return ids.filter(id => includes(results[id], uid)).length;
  }
);

export const getSortedDailyResultIds = createSelector(
  [getResults, getDailyResultIds],
  (results, dailyResultIds) => {
    forEach(dailyResultIds, (_, key) => {
      dailyResultIds[key].sort(
        (a, b) => results[b].date.seconds - results[a].date.seconds
      );
    });
    return dailyResultIds;
  }
);

const getUserStatics = (results, userlyResultIds, uid) => {
  let statics = {
    playNum: 0,
    winNum: 0,
    winRate: 0.0,
    highestScore: { score: 0 },
    lowestScore: { score: 0 },
    averageScore: 0.0,
    favoriteColor: null,
    record: []
  };
  if (userlyResultIds[uid]) {
    let totalScore = 0;
    let colors = { Red: 0, Blue: 0, Green: 0, White: 0, Purple: 0 };
    userlyResultIds[uid].forEach(resultId => {
      const myResult = results[resultId].results.find(
        result => result.uid == uid
      );
      let myRank = 1;
      results[resultId].results.forEach(result => {
        if (result.score.total > myResult.score.total) {
          ++myRank;
        }
      });
      const score = myResult.score.total;
      const date = results[resultId].date;
      totalScore += score;
      if (myRank === 1) {
        statics.winNum++;
      }
      if (score > statics.highestScore.score) {
        statics.highestScore = { score, date };
      }
      if (
        score < statics.lowestScore.score ||
        statics.lowestScore.score === 0
      ) {
        statics.lowestScore = { score, date };
      }
      statics.record.push({ rank: myRank, order: myResult.order, date });
      colors[myResult.color]++;
    });
    statics.playNum = userlyResultIds[uid].length;
    statics.averageScore = (totalScore / statics.playNum).toFixed(1);
    statics.winRate = ((statics.winNum / statics.playNum) * 100).toFixed(1);
    let num = 0;
    Object.keys(colors).forEach(key => {
      if (num < colors[key]) {
        num = colors[key];
        statics.favoriteColor = key;
      }
    });
  }
  return statics;
};

export const getUserStaticsById = createSelector(
  [getResults, getUserlyResultIds, getPropsUid],
  (results, userlyResultIds, uid) => {
    return getUserStatics(results, userlyResultIds, uid);
  }
);

export const getAllUserStatics = createSelector(
  [getResults, getUserlyResultIds, getUserIds],
  (results, userlyResultIds, uids) => {
    let allStatics = {};
    uids.forEach(uid => {
      allStatics[uid] = getUserStatics(results, userlyResultIds, uid);
    });
    return allStatics;
  }
);
