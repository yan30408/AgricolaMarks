import { createStore, combineReducers } from "redux";
// import thunk from "redux-thunk";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";

// app
import state from "./modules/app.state";
import results from "./modules/app.results";
import players from "./modules/app.players";

// entities

const appStatePersistConfig = {
  key: "store.app.state",
  storage,
  whitelist: ["currentPlayerId", "currentOrder", "isOpenResult", "isOpenSetup"]
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
  })
  //   entities: combineReducers({
  //     rooms,
  //     logs,
  //     roomCharacters,
  //     roomCommands,
  //     roomEffects,
  //     roomDices,
  //     roomItems,
  //     roomMembers,
  //     roomMessages,
  //     roomNotes,
  //     roomScenes,
  //     userFiles,
  //     userMedia,
  //     userHistories
  //   })
});

// export const store = createStore(rootReducer, applyMiddleware(thunk));
export const store = createStore(
  rootReducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);
export const persistor = persistStore(store);

// window._s = store;
