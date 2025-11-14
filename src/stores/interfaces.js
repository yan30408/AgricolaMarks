import * as state from "./modules/app.state";
import * as appResults from "./modules/app.results";
import * as appPlayers from "./modules/app.players";
import * as users from "./modules/entities.users";
import * as results from "./modules/entities.results";
import * as userStats from "./modules/entities.userStats";
import * as userStatsSummary from "./modules/entities.userStatsSummary";
import * as globalStats from "./modules/entities.globalStats";

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
  ...results.operations,
  ...userStats.selectors,
  ...userStats.operations,
  ...userStatsSummary.selectors,
  ...userStatsSummary.operations,
  ...globalStats.selectors,
  ...globalStats.operations
};
