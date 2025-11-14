import {
  RESULTS_FETCH_REQUEST,
  RESULTS_FETCH_SUCCESS,
  RESULTS_FETCH_FAILURE,
  RESULTS_RESET
} from "./types";

export const fetchResultsRequest = payload => ({
  type: RESULTS_FETCH_REQUEST,
  payload
});

export const fetchResultsSuccess = payload => ({
  type: RESULTS_FETCH_SUCCESS,
  payload
});

export const fetchResultsFailure = payload => ({
  type: RESULTS_FETCH_FAILURE,
  payload
});

export const resetResultsState = () => ({
  type: RESULTS_RESET
});
