import {
  fetchResultsRequest,
  fetchResultsSuccess,
  fetchResultsFailure,
  resetResultsState,
  resultsUpsert
} from "./actions";
import { RESULTS_PAGE_SIZE } from "./types";
import { db, FieldPath, Timestamp, FieldValue } from "initializer";
import { DEFAULT_GAME_MODE } from "Constants";

const resultsRef = db.collection("results");
const rebuildLockRef = db.collection("meta").doc("ratingLock");

async function ensureRebuildUnlocked() {
  try {
    const snapshot = await rebuildLockRef.get();
    if (snapshot.exists && snapshot.data()?.locked) {
      return false;
    }
  } catch (error) {
    console.error(error);
  }
  return true;
}

function confirmRebuild(actionLabel) {
  if (typeof window === "undefined") {
    return true;
  }
  const label = actionLabel
    ? `${actionLabel}を実行すると`
    : "この操作を実行すると";
  return window.confirm(
    `${label}レーティング再計算が開始されます。処理には数分かかる場合があります。続行しますか？`
  );
}

const handleOperationError = error => {
  console.error(error);
};
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
  const playedAtTimestamp = toTimestamp(data.playedAt || data.date);
  const normalized = {
    ...data,
    results: Array.isArray(data.results) ? data.results : [],
    playedAt: playedAtTimestamp,
    participantCount: Array.isArray(data.results) ? data.results.length : 0,
    gameMode: data.gameMode || DEFAULT_GAME_MODE,
    _id: doc.id,
    _path: doc.ref.path
  };
  delete normalized.date;
  return normalized;
};

const buildCursor = lastDoc => {
  if (!lastDoc) return null;
  const data = lastDoc.data() || {};
  const playedAt = toTimestamp(data.playedAt || data.date);
  const plain = toPlainTimestamp(playedAt);
  if (!plain) {
    return {
      docId: lastDoc.id
    };
  }
  return {
    docId: lastDoc.id,
    playedAt: plain
  };
};

const shouldUseCursor = cursor =>
  cursor &&
  cursor.docId &&
  cursor.playedAt &&
  typeof cursor.playedAt.seconds === "number";

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
      .orderBy("playedAt", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(limit);

    if (effectiveFilters?.gameMode) {
      query = query.where("gameMode", "==", effectiveFilters.gameMode);
    }

    if (!reset) {
      const cursor = state.cursor;
      if (shouldUseCursor(cursor)) {
        const { playedAt, docId } = cursor;
        const timestamp = new Timestamp(
          playedAt.seconds,
          playedAt.nanoseconds || 0
        );
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
    toTimestamp(data.playedAt || data.date) || Timestamp.fromDate(new Date());
  return {
    playedAt: playedAtTimestamp,
    participantCount: Array.isArray(data.results) ? data.results.length : 0,
    results: data.results || [],
    gameMode: data.gameMode || DEFAULT_GAME_MODE,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp()
  };
};

export const addResult = data => async dispatch => {
  if (!data) return false;
  if (!(await ensureRebuildUnlocked())) {
    return false;
  }
  const payload = prepareWritePayload(data);
  try {
    await resultsRef.add(payload);
    dispatch(fetchResultsPage({ reset: true }));
    return true;
  } catch (error) {
    handleOperationError(error);
    return false;
  }
};

export const updateResult = (
  id,
  data,
  { skipConfirm = false } = {}
) => async dispatch => {
  if (!data) return false;
  if (!(await ensureRebuildUnlocked())) {
    return false;
  }
  if (!skipConfirm && !confirmRebuild("編集内容の保存")) {
    return false;
  }
  const payload = prepareWritePayload(data);
  delete payload.createdAt;
  try {
    await resultsRef.doc(id).update(payload);
    dispatch(fetchResultsPage({ reset: true }));
    return true;
  } catch (error) {
    handleOperationError(error);
    return false;
  }
};

export const deleteResult = (
  id,
  { skipConfirm = false } = {}
) => async dispatch => {
  if (!id) {
    return false;
  }
  if (!(await ensureRebuildUnlocked())) {
    return false;
  }
  if (!skipConfirm && !confirmRebuild("結果の削除")) {
    return false;
  }
  try {
    await resultsRef.doc(id).delete();
    dispatch(fetchResultsPage({ reset: true }));
    return true;
  } catch (error) {
    handleOperationError(error);
    return false;
  }
};

export const ensureResultById = id => async (dispatch, getState) => {
  if (!id) return null;
  const existing = getState()?.entities?.results?.byId?.[id] ?? null;
  if (existing) {
    return existing;
  }
  try {
    const snapshot = await resultsRef.doc(id).get();
    if (!snapshot.exists) {
      return null;
    }
    const item = normalizeResultDoc(snapshot);
    dispatch(resultsUpsert([item]));
    return item;
  } catch (error) {
    console.error("Failed to fetch result by id", error);
    return null;
  }
};
