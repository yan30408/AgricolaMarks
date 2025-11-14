import {
  fetchResultsRequest,
  fetchResultsSuccess,
  fetchResultsFailure,
  resetResultsState
} from "./actions";
import { RESULTS_PAGE_SIZE } from "./types";
import { db, FieldPath, Timestamp, FieldValue } from "initializer";
import { DEFAULT_GAME_MODE } from "Constants";

const resultsRef = db.collection("results");

const toTimestamp = value => {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    return value;
  }
  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }
  if (value.seconds !== undefined) {
    return new Timestamp(value.seconds, value.nanoseconds || 0);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return Timestamp.fromDate(parsed);
};

const toPlainTimestamp = timestamp => {
  if (!timestamp || typeof timestamp.seconds !== "number") {
    return null;
  }
  return {
    seconds: timestamp.seconds,
    nanoseconds: timestamp.nanoseconds || 0
  };
};

const normalizeResultDoc = doc => {
  const data = doc.data() || {};
  const dateTimestamp = toTimestamp(data.date);
  const playedAtTimestamp = toTimestamp(data.playedAt || dateTimestamp);
  return {
    ...data,
    playedAt: playedAtTimestamp,
    date: dateTimestamp,
    participantCount: Array.isArray(data.results) ? data.results.length : 0,
    gameMode: data.gameMode || DEFAULT_GAME_MODE,
    _id: doc.id,
    _path: doc.ref.path
  };
};

const buildCursor = lastDoc => {
  if (!lastDoc) return null;
  const data = lastDoc.data() || {};
  const date = toTimestamp(data.date);
  return {
    docId: lastDoc.id,
    date: toPlainTimestamp(date)
  };
};

const shouldUseCursor = cursor =>
  cursor &&
  cursor.docId &&
  cursor.date &&
  typeof cursor.date.seconds === "number";

export const resetResults = () => dispatch => {
  dispatch(resetResultsState());
};

export const fetchResultsPage = ({
  reset = false,
  limit = RESULTS_PAGE_SIZE,
  filters = {}
} = {}) => async (dispatch, getState) => {
  const state = getState().entities.results;
  if (state.loading) return;
  if (!reset && !state.hasMore) return;

  const effectiveFilters = reset ? filters : state.filters || filters;

  dispatch(
    fetchResultsRequest({
      reset,
      filters: effectiveFilters
    })
  );

  try {
    let query = resultsRef
      .orderBy("date", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(limit);

    if (effectiveFilters?.gameMode) {
      query = query.where("gameMode", "==", effectiveFilters.gameMode);
    }

    if (!reset) {
      const cursor = state.cursor;
      if (shouldUseCursor(cursor)) {
        const { date, docId } = cursor;
        const timestamp = new Timestamp(date.seconds, date.nanoseconds || 0);
        query = query.startAfter(timestamp, docId);
      } else if (cursor?.docId) {
        query = query.startAfter(cursor.docId);
      }
    }

    const snapshot = await query.get();
    const docs = snapshot.docs;
    const items = docs.map(normalizeResultDoc);
    const hasMore = docs.length === limit;
    const cursor = hasMore ? buildCursor(docs[docs.length - 1]) : null;

    dispatch(
      fetchResultsSuccess({
        items,
        cursor,
        hasMore
      })
    );
  } catch (error) {
    dispatch(fetchResultsFailure(error?.message || "Failed to fetch results"));
  }
};

const prepareWritePayload = data => {
  const playedAtTimestamp =
    toTimestamp(data.date) || Timestamp.fromDate(new Date());
  return {
    date: playedAtTimestamp,
    playedAt: playedAtTimestamp,
    participantCount: Array.isArray(data.results) ? data.results.length : 0,
    results: data.results || [],
    gameMode: data.gameMode || DEFAULT_GAME_MODE,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp()
  };
};

export const addResult = data => async dispatch => {
  if (!data) return null;
  const payload = prepareWritePayload(data);
  await resultsRef.add(payload);
  dispatch(fetchResultsPage({ reset: true }));
};

export const updateResult = (id, data) => async dispatch => {
  if (!data) return null;
  const payload = prepareWritePayload(data);
  delete payload.createdAt;
  await resultsRef.doc(id).update(payload);
  dispatch(fetchResultsPage({ reset: true }));
};

export const deleteResult = id => async dispatch => {
  await resultsRef.doc(id).delete();
  dispatch(fetchResultsPage({ reset: true }));
};
