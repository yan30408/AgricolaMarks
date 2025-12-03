import { createTypes } from "../firestoreModuleUtils";

const baseTypes = createTypes("entities/userStats");

const types = {
  ...baseTypes,
  SET_RESULT_IDS: "entities/userStats/SET_RESULT_IDS",
  CLEAR_RESULT_IDS: "entities/userStats/CLEAR_RESULT_IDS"
};

export default types;
