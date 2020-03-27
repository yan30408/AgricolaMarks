import { createStore, combineReducers, applyMiddleware, compose } from "redux";
import thunk from "redux-thunk";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";

// app
import state from "./modules/app.state";
import results from "./modules/app.results";
import players from "./modules/app.players";

// entities
import users from "./modules/entities.users";

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
    results: persistReducer(appResultsPersistConfig, results),
    players: persistReducer(appPlayersPersistConfig, players)
  }),
  entities: combineReducers({
    users
  })
});

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
export const store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(thunk))
);
export const persistor = persistStore(store);

// window._s = store;
