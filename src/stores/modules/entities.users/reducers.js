import types from "./types";
import { combineReducers } from "redux";
import { createByIdReducer, createIndexReducer } from "../firestoreModuleUtils";

const byId = createByIdReducer(types);
const allIds = createIndexReducer(types);

export default combineReducers({
  byId,
  allIds
});
