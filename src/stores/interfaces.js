import * as state from "./modules/app.state";
import * as appResults from "./modules/app.results";
import * as appPlayers from "./modules/app.players";
import * as users from "./modules/entities.users";
import * as results from "./modules/entities.results";

export default {
  ...state.selectors,
  ...state.operations,
  ...appResults.selectors,
  ...appResults.operations,
  ...appPlayers.selectors,
  ...appPlayers.operations,
  ...users.selectors,
  ...users.operations,
  ...results.selectors,
  ...results.operations
};
