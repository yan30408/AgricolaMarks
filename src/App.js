import React from "react";
import {
  StyledEngineProvider,
  ThemeProvider,
  createTheme
} from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Provider } from "react-redux";
import { store } from "./stores";

import Home from "containers/Home";

const theme = createTheme();

const App = () => {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Provider store={store}>
          <Home />
        </Provider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

export default App;
