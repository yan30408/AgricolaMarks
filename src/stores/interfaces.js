import * as state from "./modules/app.state";
import * as results from "./modules/app.results";
import * as players from "./modules/app.players";
import * as users from "./modules/entities.users";

export default {
  ...state.selectors,
  ...state.operations,
  ...results.selectors,
  ...results.operations,
  ...players.selectors,
  ...players.operations,
  ...users.selectors,
  ...users.operations
};
