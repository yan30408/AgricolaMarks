import React from "react";
import { Provider } from "react-redux";
import { store } from "./stores";

import Home from "containers/Home";

const App = () => {
  return (
    <Provider store={store}>
      <Home />
    </Provider>
  );
};

export default App;