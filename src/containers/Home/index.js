import React, { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@material-ui/core/styles";
import {
  Button,
  IconButton,
  Tabs,
  Tab,
  Toolbar,
  CssBaseline,
  AppBar,
  Typography,
  Paper
} from "@material-ui/core";

import MenuIcon from "@material-ui/icons/Menu";

import CalcForm from "containers/CalcForm";
import Result from "containers/Result";
import Setup from "containers/Setup";
import AboutDialog from "containers/AboutDialog";
import AlertDialog from "components/AlertDialog";
import { Orders } from "Constants";

import MainMenu from "./MainMenu";

const useStyles = makeStyles({
  flex: {
    flex: 1
  }
});

const Home = props => {
  const classes = useStyles();
  const d = useDispatch();
  const openAllClear = useSelector(state =>
    store.getAppState(state, "isOpenAllClear")
  );
  const order = useSelector(state => store.getAppState(state, "currentOrder"));
  const players = useSelector(state => store.getValidPlayers(state));
  const result = useSelector(state => store.getAppResultByIndex(state, order));

  const onChangeOrder = useCallback(
    (_, value) => {
      const player = players.find(player => player.order === value);
      d(
        store.appStateMutate(state => {
          state.currentOrder = value;
          state.currentPlayerId = player ? player.id : -1;
        })
      );
    },
    [d, players]
  );
  const onClickMenu = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenMenu = true;
      })
    );
  }, [d]);
  const onClickResult = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenResult = true;
      })
    );
  }, [d]);
  const onCloseAllClear = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenAllClear = false;
      })
    );
  }, [d]);
  const onClickOkAllClear = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.currentPlayerId = -1;
        state.currentOrder = 0;
        state.isOpenAllClear = false;
        state.isOpenMenu = false;
      })
    );
    d(store.appResultsInit);
  }, [d]);

  useEffect(() => {
    d(store.subscribeUserState());
  }, [d]);

  return (
    <React.Fragment>
      <CssBaseline />
      <AppBar position="fixed" color="default">
        <Toolbar>
          <IconButton onClick={onClickMenu} color="inherit">
            <MenuIcon />
          </IconButton>
          <MainMenu />
          <Tabs
            value={order}
            onChange={onChangeOrder}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            {[0, 1, 2, 3, 4].map(value => {
              const player = players.find(player => player.order === value);
              const color = player ? player.color.sub : "";
              return (
                <Tab
                  key={Orders[value]}
                  label={Orders[value]}
                  style={{
                    minWidth: "20%",
                    backgroundColor: color
                  }}
                />
              );
            })}
          </Tabs>
          <div className={classes.flex} />
          <Button
            onClick={onClickResult}
            color="inherit"
            size="small"
            variant="outlined"
          >
            Result
          </Button>
        </Toolbar>
      </AppBar>
      <CalcForm />
      <Paper
        style={{ position: "fixed", top: "auto", bottom: 0, width: "100%" }}
      >
        <Typography variant="h5" color="inherit" align="center">
          Score : {result.score.total}
        </Typography>
      </Paper>
      <Result />
      <Setup />
      <AlertDialog
        title={"Reset all inputs?"}
        onClose={onCloseAllClear}
        onClickOk={onClickOkAllClear}
        isOpen={openAllClear}
      >
        現在入力中のスコアを全てリセットしますか？
      </AlertDialog>
      <AboutDialog />
    </React.Fragment>
  );
};

export default Home;
