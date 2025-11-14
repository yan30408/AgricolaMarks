import {
  RESULTS_FETCH_REQUEST,
  RESULTS_FETCH_SUCCESS,
  RESULTS_FETCH_FAILURE,
  RESULTS_RESET
} from "./types";

const initialState = {
  byId: {},
  orderedIds: [],
  cursor: null,
  hasMore: true,
  loading: false,
  error: null,
  filters: {},
  initialized: false
};

const ensureUniquePush = (array, value) => {
  if (!array.includes(value)) {
    array.push(value);
  }
};

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case RESULTS_FETCH_REQUEST: {
      const { reset = false, filters = {} } = action.payload || {};
      if (reset) {
        return {
          ...initialState,
          loading: true,
          filters
        };
      }
      return {
        ...state,
        loading: true,
        error: null,
        filters: Object.keys(filters).length ? filters : state.filters
      };
    }
    case RESULTS_FETCH_SUCCESS: {
      const { items = [], cursor = null, hasMore = true } =
        action.payload || {};
      const byId = { ...state.byId };
      const orderedIds = [...state.orderedIds];

      items.forEach(item => {
        if (!item || !item._id) {
          return;
        }
        byId[item._id] = item;
        ensureUniquePush(orderedIds, item._id);
      });

      return {
        ...state,
        loading: false,
        error: null,
        byId,
        orderedIds,
        cursor,
        hasMore,
        initialized: true
      };
    }
    case RESULTS_FETCH_FAILURE: {
      return {
        ...state,
        loading: false,
        error: action.payload || "failed to fetch results"
      };
    }
    case RESULTS_RESET: {
      return initialState;
    }
    default:
      return state;
  }
}

export { initialState };
