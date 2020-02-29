import React, { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";

import { withStyles } from "@material-ui/core/styles";
import {
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Toolbar,
  Dialog,
  AppBar,
  Typography,
  Avatar,
  ImageIcon,
  Slide
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import RestartIcon from "@material-ui/icons/Refresh";

import AlertDialog from "components/AlertDialog";

function Transition(props) {
  return <Slide direction="down" {...props} />;
}

const ZeroPadding = num => {
  return ("00" + num).slice(-2);
};

const FullScreenDialog = props => {
  const d = useDispatch();
  const isOpen = useSelector(state => store.getAppState(state, "isOpenResult"));
  const sortedResult = useSelector(state => store.getSortedResult(state));

  const { isOpenNewGame, setOpenNewGame } = useState(false);
  const onClose = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenResult = false;
      })
    );
  }, []);
  const onClickNewGame = useCallback(() => {
    setOpenNewGame(true);
  }, []);
  const onCloseNewGame = useCallback(() => {
    setOpenNewGame(false);
  }, []);
  const onClickOkNewGame = useCallback(() => {
    setOpenNewGame(false);

    // onClickOkNewGame = () => {
    //   let playersInfo = this.state.playersInfo.map(pinfo => {
    //     return {
    //       id: pinfo.id,
    //       name: pinfo.name,
    //       color: pinfo.color,
    //       order: null
    //     };
    //   });
    //   const playerResults = getDefaultPlayerReults();
    //   this.setState({
    //     playerResults: playerResults,
    //     playersInfo: playersInfo,
    //     currentPlayer: 0,
    //     isOpenResult: false
    //   });
    //   store.set("currentPlayer", 0);
    //   store.set("isOpenResult", false);
    //   store.set("playersInfo", playersInfo);
    //   store.set("playerResults", playerResults);
    //   this.forcedScrollBonus();
    // };
  }, []);
  const { classes } = props;
  const now = new Date();
  const year = now.getYear() + 1900; // 年
  const month = ZeroPadding(now.getMonth() + 1); // 月
  const day = ZeroPadding(now.getDate()); // 日
  const hour = ZeroPadding(now.getHours()); // 時
  const min = ZeroPadding(now.getMinutes()); // 分
  const sec = ZeroPadding(now.getSeconds()); // 秒
  const date =
    year + "." + month + "." + day + " - " + hour + ":" + min + ":" + sec;

  return (
    <div>
      <Dialog
        fullScreen
        open={isOpen}
        onClose={onClose}
        TransitionComponent={Transition}
      >
        <AppBar className={classes.appBar}>
          <Toolbar>
            <IconButton color="inherit" onClick={onClose} aria-label="Close">
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" color="inherit" className={classes.flex}>
              Result
            </Typography>
          </Toolbar>
        </AppBar>
        <List>
          <ListItem divider>
            <ListItemText>
              <Typography variant="h6" align="center">
                {date}
              </Typography>
            </ListItemText>
          </ListItem>
          {sortedResult.map((result, index) => (
            <div key={index}>
              <ListItem style={{ backgroundColor: result.color }} divider>
                {/*
                <Avatar>
                  <ImageIcon />
                </Avatar>
                */}
                <ListItemText
                  primary={<Typography variant="h6">{result.name}</Typography>}
                  secondary={result.order}
                  style={{ width: 100 }}
                />
                <ListItemText
                  secondary={
                    <Typography variant="" align="left">
                      {`[ ${result.score.inFarm} + ${result.score.outside} ]`}
                    </Typography>
                  }
                />
                <ListItemText secondary={" → "} />
                <ListItemText
                  primary={
                    <Typography variant="h5">{result.score.total}</Typography>
                  }
                />
              </ListItem>
            </div>
          ))}
          <ListItem>
            <Button
              color="inherit"
              onClick={onClickNewGame}
              fullWidth
              variant="contained"
              className={classes.button}
            >
              Newgame
              <RestartIcon className={classes.rightIcon} />
            </Button>
          </ListItem>
        </List>
        <AlertDialog
          title="Start New Game ?"
          isOpen={isOpenNewGame}
          onClose={onCloseNewGame}
          onClickOk={onClickOkNewGame}
        >
          新しいゲームを始めますか？
        </AlertDialog>
      </Dialog>
    </div>
  );
};

const styles = theme => ({
  appBar: {
    position: "relative"
  },
  flex: {
    flex: 1
  },
  button: {
    margin: theme.spacing.unit
  },
  rightIcon: {
    marginLeft: theme.spacing.unit
  }
});

export default withStyles(styles)(FullScreenDialog);
