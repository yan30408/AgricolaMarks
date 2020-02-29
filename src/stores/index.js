import { createStore, combineReducers, applyMiddleware, compose } from "redux";
// import thunk from "redux-thunk";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";

// app
import state from "./modules/app.state";
import result from "./modules/app.result";
import players from "./modules/app.players";

// entities

const appStatePersistConfig = {
  key: "store.app.state",
  storage,
  whitelist: ["currentPlayer", "isOpenResult", "isOpenSetup"]
};

const appResultPersistConfig = {
  key: "store.app.result",
  storage
};

const appPlayerPersistConfig = {
  key: "store.app.player",
  storage
};

const rootReducer = combineReducers({
  app: combineReducers({
    state: persistReducer(appStatePersistConfig, state),
    result: persistReducer(appResultPersistConfig, result),
    players: persistReducer(appPlayerPersistConfig, players)
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
export const store = createStore(rootReducer);
export const persistor = persistStore(store);

// window._s = store;
