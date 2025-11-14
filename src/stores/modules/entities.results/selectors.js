import { createSelector } from "reselect";
import { format } from "date-fns";

const getState = state => state.entities.results || {};

export const getResultsLoading = state => getState(state).loading;
export const getResultsHasMore = state => getState(state).hasMore;
export const getResultsError = state => getState(state).error;
export const getResultsFilters = state => getState(state).filters || {};
export const getResultsInitialized = state => getState(state).initialized;

export const getResultById = (state, id) => getState(state).byId?.[id] || null;

export const getResultsOrderedIds = createSelector(
  [getState],
  resultsState => resultsState.orderedIds || []
);

const toDate = value => {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    return value.toDate();
  }
  if (value.seconds !== undefined) {
    return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6);
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDayKey = value => {
  const date = toDate(value);
  if (!date) {
    return "Unknown";
  }
  try {
    return format(date, "yyyy/MM/dd");
  } catch (error) {
    return "Unknown";
  }
};

export const getResultsGroupedByDay = createSelector(
  [getResultsOrderedIds, getState],
  (ids, resultsState) => {
    const byId = resultsState.byId || {};
    const groups = [];
    ids.forEach(id => {
      const result = byId[id];
      if (!result) return;
      const dayKey = formatDayKey(result.playedAt || result.date);
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.day !== dayKey) {
        groups.push({ day: dayKey, resultIds: [id] });
      } else {
        lastGroup.resultIds.push(id);
      }
    });
    return groups;
  }
);
