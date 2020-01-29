import React from "react";
import store from "store";
import { withStyles } from "@material-ui/core/styles";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import AppBar from "@material-ui/core/AppBar";
import Typography from "@material-ui/core/Typography";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import Button from "@material-ui/core/Button";
import MenuIcon from "@material-ui/icons/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import Menu from "@material-ui/core/Menu";
import CalcCore from "./CalcCore";
import Result from "./Result";
import Setup from "./Setup";
import AlertDialog from "./AlertDialog";
import AboutDialog from "./AboutDialog";
import { ScoreByRoomType, Orders, Colors } from "./Constants";
import CssBaseline from "@material-ui/core/CssBaseline";
import rsScroller from "react-smooth-scroller";

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

const styles = {
  root: {
    flexGrow: 1,
    backgroundColor: "Blue"
  },
  flex: {
    flex: 1
  }
};

function getDefaultPlayersInfo() {
  return Array(5)
    .fill(0)
    .map((value, index) => {
      return {
        id: index,
        name: null,
        color: Colors[Object.keys(Colors)[index]],
        order: null
      };
    });
}

function getDefaultPlayerReults() {
  return Array(5)
    .fill(0)
    .map((value, index) => {
      return {
        category: {
          Fields: { value: 0, score: -1 },
          Pastures: { value: 0, score: -1 },
          Grain: { value: 0, score: -1 },
          Vegetables: { value: 0, score: -1 },
          Sheep: { value: 0, score: -1 },
          "Wild boar": { value: 0, score: -1 },
          Cattle: { value: 0, score: -1 },
          "Unused Spaces": { value: 0, score: 0 },
          Stable: { value: 0, score: 0 },
          Rooms: {
            value: 0,
            score: 0,
            type: "Wood" /*Object.keys(ScoreByRoomType)[0] */
          },
          Family: { value: 0, score: 6 },
          Beggar: { value: 0, score: 0 },
          Improvement: { value: 0, score: 0 },
          Bonus: { value: 14, score: 0 }
        },
        score: {
          inFarm: -1,
          outside: 0,
          total: -1
        },
        id: -1
      };
    });
}

class CalcGames extends React.Component {
  state = {
    currentPlayer: store.get("currentPlayer") || 0,
    anchorEl: null,
    isOpenResult: store.get("isOpenResult") || false,
    isOpenSetup: store.get("isOpenSetup") || false,
    isOpenAllClear: false,
    isOpenAbout: false,
    playersInfo: store.get("playersInfo") || getDefaultPlayersInfo(),
    playerResults: store.get("playerResults") || getDefaultPlayerReults()
  };

  onChangeCurrentPlayer = (event, value) => {
    rsScroller.scrollToTop({ duration: 500 });
    this.setState({ currentPlayer: value });
    store.set("currentPlayer", value);
  };

  onClickMenu = event => {
    this.setState({ anchorEl: event.currentTarget });
  };

  onCloseMenu = () => {
    this.setState({ anchorEl: null });
  };

  onChange5btn = (event, value, id) => {
    let playerResults = this.state.playerResults;
    const { category } = playerResults[this.state.currentPlayer];
    category[id].value = value;
    category[id].score = value === 0 ? -1 : value;
    this.calcScores(playerResults[this.state.currentPlayer]);
    this.setState({ playerResults: playerResults });
    store.set("playerResults", playerResults);
  };

  onChangeBtn = (event, value, id, point, beginIndex) => {
    let playerResults = this.state.playerResults;
    const { category } = playerResults[this.state.currentPlayer];
    category[id].value = value;
    category[id].score = (value + beginIndex) * point;
    this.calcScores(playerResults[this.state.currentPlayer]);
    this.setState({ playerResults: playerResults });
    store.set("playerResults", playerResults);
  };

  onChangeRoomType = event => {
    let playerResults = this.state.playerResults;
    const { category } = playerResults[this.state.currentPlayer];
    category["Rooms"].score =
      (category["Rooms"].value + 2) * ScoreByRoomType[event.target.value];
    category["Rooms"].type = event.target.value;
    this.calcScores(playerResults[this.state.currentPlayer]);
    this.setState({ playerResults: playerResults });
    store.set("playerResults", playerResults);
  };

  onChangePlayer = event => {
    let playerResults = this.state.playerResults;
    let playersInfo = this.state.playersInfo;
    if (playerResults[this.state.currentPlayer].id !== -1) {
      playersInfo[playerResults[this.state.currentPlayer].id].order = null;
    }
    playerResults[this.state.currentPlayer].id = event.target.value;
    if (event.target.value !== -1) {
      playersInfo[event.target.value].order = Orders[this.state.currentPlayer];
    }
    this.setState({ playerResults: playerResults, playersInfo: playersInfo });
    store.set("playerResults", playerResults);
    store.set("playersInfo", playersInfo);
  };

  onClickResult = () => {
    this.setState({ isOpenResult: true, anchorEl: null });
    store.set("isOpenResult", true);
  };

  onCloseResult = () => {
    this.setState({ isOpenResult: false });
    store.set("isOpenResult", false);
  };

  onClickSetup = () => {
    this.setState({ isOpenSetup: true, anchorEl: null });
    store.set("isOpenSetup", true);
  };

  onCloseSetup = () => {
    this.setState({ isOpenSetup: false });
    store.set("isOpenSetup", false);
  };

  onClickAllClear = () => {
    this.setState({ isOpenAllClear: true, anchorEl: null });
  };

  onCloseAllClear = () => {
    this.setState({ isOpenAllClear: false });
  };

  onClickOkAllClear = () => {
    const playersInfo = getDefaultPlayersInfo();
    const playerResults = getDefaultPlayerReults();
    this.setState({
      currentPlayer: 0,
      playersInfo: playersInfo,
      playerResults: playerResults,
      isOpenAllClear: false
    });
    store.set("currentPlayer", 0);
    store.set("playersInfo", playersInfo);
    store.set("playerResults", playerResults);
    this.forcedScrollBonus();
  };

  onClickOkNewGame = () => {
    let playersInfo = this.state.playersInfo.map(pinfo => {
      return {
        id: pinfo.id,
        name: pinfo.name,
        color: pinfo.color,
        order: null
      };
    });
    const playerResults = getDefaultPlayerReults();
    this.setState({
      playerResults: playerResults,
      playersInfo: playersInfo,
      currentPlayer: 0,
      isOpenResult: false
    });
    store.set("currentPlayer", 0);
    store.set("isOpenResult", false);
    store.set("playersInfo", playersInfo);
    store.set("playerResults", playerResults);
    this.forcedScrollBonus();
  };

  onChangeName = (event, index) => {
    let playersInfo = this.state.playersInfo.slice();
    playersInfo[index].name = event.target.value.substr(0, 10);
    this.setState(playersInfo);
    store.set("playersInfo", playersInfo);
  };

  onChangeColor = (event, index) => {
    let playersInfo = this.state.playersInfo.slice();
    playersInfo[index].color = event.target.value;
    this.setState(playersInfo);
    store.set("playersInfo", playersInfo);
  };

  componentDidMount() {
    this.forcedScrollBonus();
  }

  // ボーナスの表示だけ左合わせにできなかったのでウンチみたいな処理
  forcedScrollBonus() {
    rsScroller.scrollToTop();
    setTimeout(() => {
      let playerResults = this.state.playerResults;
      playerResults.forEach(result => {
        if (
          result.category["Bonus"].value === 14 &&
          result.category["Bonus"].score === 0
        ) {
          result.category["Bonus"].value = 10;
        }
      });
      this.setState(playerResults);
    }, 1000);
  }

  render() {
    const { classes } = this.props;
    const { playerResults } = this.state;
    const open = Boolean(this.state.anchorEl);
    const currentResult = this.state.playerResults[this.state.currentPlayer];

    return (
      <React.Fragment>
        <CssBaseline />
        <AppBar position="fixed" color="default">
          <Toolbar className={classes.flex}>
            <IconButton
              aria-owns={open ? "menu-appbar" : undefined}
              aria-haspopup="true"
              onClick={this.onClickMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={this.state.anchorEl}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right"
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right"
              }}
              open={Boolean(this.state.anchorEl)}
              onClose={this.onCloseMenu}
            >
              <MenuItem onClick={this.onClickSetup}>Set up</MenuItem>
              <MenuItem onClick={this.onClickAllClear}>AllClear</MenuItem>
              <MenuItem
                onClick={() =>
                  this.setState({ isOpenAbout: true, anchorEl: null })
                }
              >
                About
              </MenuItem>
            </Menu>
            <Tabs
              value={this.state.currentPlayer}
              onChange={this.onChangeCurrentPlayer}
              indicatorColor="primary"
              textColor="primary"
              fullWidth
            >
              {[0, 1, 2, 3, 4].map(value => (
                <Tab
                  label={Orders[value]}
                  style={{
                    minWidth: "20%",
                    backgroundColor:
                      playerResults[value].id !== -1
                        ? this.state.playersInfo[playerResults[value].id].color
                            .sub
                        : ""
                  }}
                />
              ))}
            </Tabs>
            <div className={classes.flex} />
            <Button
              onClick={this.onClickResult}
              color="inherit"
              size="small"
              variant="outlined"
            >
              Result
            </Button>
          </Toolbar>
        </AppBar>
        <TabContainer
          color={
            currentResult.id !== -1
              ? this.state.playersInfo[currentResult.id].color.sub
              : ""
          }
        >
          <CalcCore
            playerResult={currentResult}
            onChangeBtn={this.onChangeBtn}
            onChange5btn={this.onChange5btn}
            onChangeRoomType={this.onChangeRoomType}
            playersInfo={this.state.playersInfo}
            onChangePlayer={this.onChangePlayer}
          />
        </TabContainer>
        <Result
          isOpen={this.state.isOpenResult}
          onClose={this.onCloseResult}
          results={playerResults.map((result, index) => {
            return {
              name:
                result.id !== -1
                  ? this.state.playersInfo[result.id].name
                  : null,
              score: result.score,
              order:
                result.id !== -1
                  ? this.state.playersInfo[result.id].order
                  : null,
              color:
                result.id !== -1
                  ? this.state.playersInfo[result.id].color.sub
                  : "Red"
            };
          })}
          onClickOkNewGame={this.onClickOkNewGame}
        />
        <Setup
          isOpen={this.state.isOpenSetup}
          onClose={this.onCloseSetup}
          onChangeName={this.onChangeName}
          onChangeColor={this.onChangeColor}
          playersInfo={this.state.playersInfo}
        />
        <AlertDialog
          title={"Rest all pages?"}
          onClose={this.onCloseAllClear}
          onClickOk={this.onClickOkAllClear}
          isOpen={this.state.isOpenAllClear}
        >
          すべてのページをリセットしますか？
        </AlertDialog>
        <AboutDialog
          onClose={() => {
            this.setState({ isOpenAbout: false });
          }}
          isOpen={this.state.isOpenAbout}
        />
      </React.Fragment>
    );
  }

  calcScores(playerResult) {
    let sum = 0;
    for (var key in playerResult.category) {
      sum += playerResult.category[key].score;
    }
    playerResult.score.total = sum;
    playerResult.score.outside =
      playerResult.category["Improvement"].score +
      playerResult.category["Bonus"].score;
    playerResult.score.inFarm =
      playerResult.score.total - playerResult.score.outside;
  }
}

export default withStyles(styles)(CalcGames);
