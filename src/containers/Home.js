import React, { useEffect, useRef, useState, useCallback } from "react";
import store from "stores/interfaces";
import { withStyles } from "@material-ui/core/styles";
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
  Menu
} from "@material-ui/core";

import MenuIcon from "@material-ui/icons/Menu";

//import CalcForm from "./CalcForm";
import Result from "./Result";
import Setup from "./Setup";
import AboutDialog from "./AboutDialog";
import AlertDialog from "components/AlertDialog";
import { ScoreByRoomType, Orders, Colors } from "../Constants";
import rsScroller from "react-smooth-scroller";
import { useDispatch } from "react-redux";

function TabContainer(props) {
  return (
    <Typography
      component="div"
      style={{ padding: "50px 10px", backgroundColor: props.color }}
    >
      {props.children}
    </Typography>
  );
}

const Home = props => {
  const { classes } = props;
  const d = useDispatch();
  const anchorEl = useRef(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [openAllClear, setOpenAllClear] = useState(false);

  const onChangeCurrentPlayer = useCallback((_, value) => {
    rsScroller.scrollToTop({ duration: 500 });
    d(
      store.actions.appStateMutate(state => {
        state.currentPlayer = value;
      })
    );
  }, []);

  const onClickMenu = useCallback(() => {
    setOpenMenu(true);
  }, []);
  const onCloseMenu = useCallback(() => {
    setOpenMenu(false);
  }, []);

  // onChangePlayer = event => {
  //   let playerResults = this.state.playerResults;
  //   let playersInfo = this.state.playersInfo;
  //   if (playerResults[this.state.currentPlayer].id !== -1) {
  //     playersInfo[playerResults[this.state.currentPlayer].id].order = null;
  //   }
  //   playerResults[this.state.currentPlayer].id = event.target.value;
  //   if (event.target.value !== -1) {
  //     playersInfo[event.target.value].order = Orders[this.state.currentPlayer];
  //   }
  //   this.setState({ playerResults: playerResults, playersInfo: playersInfo });
  //   store.set("playerResults", playerResults);
  //   store.set("playersInfo", playersInfo);
  // };

  const onClickResult = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenResult = true;
      })
    );
  }, []);
  const onClickAbout = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenAbout = true;
      })
    );
  }, []);
  const onClickSetup = useCallback(() => {
    setOpenMenu(false);
    d(
      store.appStateMutate(state => {
        state.isOpenSetup = true;
      })
    );
  }, []);
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
        state.currentPlayer = 0;
      })
    );
    // store.set("playersInfo", playersInfo);
    // store.set("playerResults", playerResults);
    //    this.forcedScrollBonus();
  }, []);

  // useEffect( () =>{}
  //   this.forcedScrollBonus();
  // });

  // // ボーナスの表示だけ左合わせにできなかったのでウンチみたいな処理
  // forcedScrollBonus() {
  //   rsScroller.scrollToTop();
  //   setTimeout(() => {
  //     let playerResults = this.state.playerResults;
  //     playerResults.forEach(result => {
  //       if (
  //         result.category["Bonus"].value === 14 &&
  //         result.category["Bonus"].score === 0
  //       ) {
  //         result.category["Bonus"].value = 10;
  //       }
  //     });
  //     this.setState(playerResults);
  //   }, 1000);
  // }

  // const { playerResults } = this.state;
  // const currentResult = this.state.playerResults[this.state.currentPlayer];
  return (
    <React.Fragment>
      <CssBaseline />
      <AppBar position="fixed" color="default">
        <Toolbar className={classes.flex}>
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
          {/* <Tabs
              value={this.state.currentPlayer}
              onChange={onChangeCurrentPlayer}
              indicatorColor="primary"
              textColor="primary"
              fullWidth
            >
              {[0, 1, 2, 3, 4].map(value => (
                <Tab
                  label={Orders[value]}
                  style={{
                    minWidth: "20%",
                    // backgroundColor:
                    //   playerResults[value].id !== -1
                    //     ? this.state.playersInfo[playerResults[value].id].color
                    //         .sub
                    //     : ""
                  }}
                />
              ))}
            </Tabs> */}
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
      {/* <TabContainer
          color={
            currentResult.id !== -1
              ? this.state.playersInfo[currentResult.id].color.sub
              : ""
          }
        >
          <CalcForm
            playerResult={currentResult}
            onChangeBtn={this.onChangeBtn}
            onChange5btn={this.onChange5btn}
            onChangeRoomType={this.onChangeRoomType}
            playersInfo={this.state.playersInfo}
            onChangePlayer={this.onChangePlayer}
          />
        </TabContainer> */}
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

const styles = {
  root: {
    flexGrow: 1,
    backgroundColor: "Blue"
  },
  flex: {
    flex: 1
  }
};
export default withStyles(styles)(Home);
