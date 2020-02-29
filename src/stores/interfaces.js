import * as state from "./modules/app.state";
//import * as result from "./modules/app.result";
import * as players from "./modules/app.players";

export default {
  ...state.selectors,
  ...state.operations,
  //  ...result.selectors,
  //   ...result.operations,
  ...players.selectors
  //   ...players.operations,
};
