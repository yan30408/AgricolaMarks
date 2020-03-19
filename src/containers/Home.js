import React, { useRef, useState, useCallback } from "react";
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
  MenuItem,
  Menu,
  Paper
} from "@material-ui/core";

import MenuIcon from "@material-ui/icons/Menu";

import CalcForm from "./CalcForm";
import Result from "./Result";
import Setup from "./Setup";
import AboutDialog from "./AboutDialog";
import AlertDialog from "components/AlertDialog";
import { Orders } from "Constants";

const useStyles = makeStyles({
  flex: {
    flex: 1
  }
});

const Home = props => {
  const classes = useStyles();
  const d = useDispatch();
  const anchorEl = useRef(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [openAllClear, setOpenAllClear] = useState(false);
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
    setOpenMenu(true);
  }, []);
  const onCloseMenu = useCallback(() => {
    setOpenMenu(false);
  }, []);
  const onClickResult = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenResult = true;
      })
    );
  }, [d]);
  const onClickAbout = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenAbout = true;
      })
    );
  }, [d]);
  const onClickSetup = useCallback(() => {
    setOpenMenu(false);
    d(
      store.appStateMutate(state => {
        state.isOpenSetup = true;
      })
    );
  }, [d]);
  const onClickAllClear = useCallback(() => {
    setOpenMenu(false);
    setOpenAllClear(true);
  }, []);
  const onCloseAllClear = useCallback(() => {
    setOpenAllClear(false);
  }, []);
  const onClickOkAllClear = useCallback(() => {
    setOpenAllClear(false);
    d(
      store.appStateMutate(state => {
        state.currentPlayerId = -1;
        state.currentOrder = 0;
      })
    );
    d(store.appPlayersInit);
    d(store.appResultsInit);
  }, [d]);

  return (
    <React.Fragment>
      <CssBaseline />
      <AppBar position="fixed" color="default">
        <Toolbar>
          <IconButton ref={anchorEl} onClick={onClickMenu} color="inherit">
            <MenuIcon />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl.current}
            anchorOrigin={{
              vertical: "top",
              horizontal: "right"
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right"
            }}
            open={openMenu}
            onClose={onCloseMenu}
          >
            <MenuItem onClick={onClickSetup}>Set up</MenuItem>
            <MenuItem onClick={onClickAllClear}>AllClear</MenuItem>
            <MenuItem onClick={onClickAbout}>About</MenuItem>
          </Menu>
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
        title={"Rest all pages?"}
        onClose={onCloseAllClear}
        onClickOk={onClickOkAllClear}
        isOpen={openAllClear}
      >
        すべてのページをリセットしますか？
      </AlertDialog>
      <AboutDialog />
    </React.Fragment>
  );
};

export default Home;
