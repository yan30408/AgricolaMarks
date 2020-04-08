import { createStore, combineReducers, applyMiddleware, compose } from "redux";
import thunk from "redux-thunk";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";

// app
import state from "./modules/app.state";
import appResults from "./modules/app.results";
import appPlayers from "./modules/app.players";

// entities
import users from "./modules/entities.users";
import results from "./modules/entities.results";

const appStatePersistConfig = {
  key: "store.app.state",
  storage,
  whitelist: ["currentOrder", "isOpenResult", "isOpenSetup"]
};

const appResultsPersistConfig = {
  key: "store.app.results",
  storage
};

const appPlayersPersistConfig = {
  key: "store.app.players",
  storage
};

const rootReducer = combineReducers({
  app: combineReducers({
    state: persistReducer(appStatePersistConfig, state),
    results: persistReducer(appResultsPersistConfig, appResults),
    players: persistReducer(appPlayersPersistConfig, appPlayers)
  }),
  entities: combineReducers({
    users,
    results
  })
});

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
export const store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(thunk))
);
export const persistor = persistStore(store);

// window._s = store;
