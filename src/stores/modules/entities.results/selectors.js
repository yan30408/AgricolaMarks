import { createSelector } from "reselect";
import { includes, forEach } from "lodash";
import { getValidUserIds, getMergedUserIds } from "../entities.users/selectors";

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

const getUserStatistics = (results, userlyResultIds, uid, state) => {
  let statistics = {
    playNum: 0,
    winRate: -1,
    highestScore: { score: 0 },
    lowestScore: { score: 0 },
    averageScore: -1,
    favoriteColor: null,
    record: []
  };
  let totalScore = 0;
  let colors = { Red: 0, Blue: 0, Green: 0, White: 0, Purple: 0 };
  let uids = getMergedUserIds(state, { uid });
  let numWin = 0;
  let numLose = 0;
  uids.push(uid);
  uids.forEach(uid => {
    if (userlyResultIds[uid]) {
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
        if (score > statistics.highestScore.score) {
          statistics.highestScore = { score, date };
        }
        if (
          score < statistics.lowestScore.score ||
          statistics.lowestScore.score === 0
        ) {
          statistics.lowestScore = { score, date };
        }
        statistics.record.push({
          id: resultId,
          rank: myRank,
          order: myResult.order,
          date
        });
        numWin += 5 - myRank;
        numLose += myRank - 1;
        colors[myResult.color]++;
      });
      statistics.playNum += userlyResultIds[uid].length;
    }
  });
  if (statistics.playNum > 0) {
    let num = 0;
    Object.keys(colors).forEach(key => {
      if (num < colors[key]) {
        num = colors[key];
        statistics.favoriteColor = key;
      }
    });
    // ある程度プレイしてない人はここで弾く
    if (statistics.playNum >= 10) {
      statistics.averageScore = (totalScore / statistics.playNum).toFixed(1);
      statistics.winRate = ((numWin / (numWin + numLose)) * 100).toFixed(1);
    }
  }
  return statistics;
};

const getState = state => state;
export const getUserStatisticsById = createSelector(
  [getResults, getUserlyResultIds, getPropsUid, getState],
  (results, userlyResultIds, uid, state) => {
    return getUserStatistics(results, userlyResultIds, uid, state);
  }
);

export const getAllUserStatistics = createSelector(
  [getResults, getUserlyResultIds, getValidUserIds, getState],
  (results, userlyResultIds, uids, state) => {
    let allStatistics = {};
    uids.forEach(uid => {
      allStatistics[uid] = getUserStatistics(
        results,
        userlyResultIds,
        uid,
        state
      );
    });
    return allStatistics;
  }
);
