import React, { memo, useEffect, useCallback } from "react";
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
import PlayerList from "containers/PlayerList";
import ResultList from "containers/ResultList";
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
  const result = useSelector(state => store.getAppResultByIndex(state, order));
  const sortedResult = useSelector(state => store.getSortedResult(state));

  const onChangeOrder = useCallback(
    (_, value) => {
      d(
        store.appStateMutate(state => {
          state.currentOrder = value;
        })
      );
    },
    [d]
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
        state.currentOrder = 0;
        state.isOpenAllClear = false;
        state.isOpenMenu = false;
      })
    );
    d(store.appResultsInit);
  }, [d]);

  useEffect(() => {
    return d(store.subscribeUsers());
  }, [d]);
  useEffect(() => {
    return d(store.subscribeUserState());
  }, [d]);
  useEffect(() => {
    return d(store.subscribeResults());
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
            {Array(5)
              .fill(0)
              .map((_, index) => (
                <OrderTab
                  key={Orders[index]}
                  value={index}
                  label={Orders[index]}
                />
              ))}
          </Tabs>
          <div className={classes.flex} />
          <Button
            onClick={onClickResult}
            color="inherit"
            size="small"
            variant="outlined"
            disabled={sortedResult.length === 0}
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
      <PlayerList />
      <ResultList />
      <AboutDialog />
    </React.Fragment>
  );
};

const OrderTab = memo(props => {
  const result = useSelector(state =>
    store.getAppResultByIndex(state, props.value)
  );
  const color = useSelector(state =>
    store.getAppCurrentPlayerById(state, result.uid)
  )?.color.sub;
  return (
    <Tab
      {...props}
      style={{
        minWidth: "20%",
        backgroundColor: color
      }}
    />
  );
});

export default Home;
