import { combineReducers } from "redux";
import { createByIdReducer, createIndexReducer } from "../firestoreModuleUtils";
import types from "./types";

const byId = createByIdReducer(types);
const allIds = createIndexReducer(types);

export default combineReducers({
  byId,
  allIds
});
