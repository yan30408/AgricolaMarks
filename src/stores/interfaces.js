import * as state from "./modules/app.state";
import * as results from "./modules/app.results";
import * as players from "./modules/app.players";

export default {
  ...state.selectors,
  ...state.operations,
  ...results.selectors,
  ...results.operations,
  ...players.selectors,
  ...players.operations
};
