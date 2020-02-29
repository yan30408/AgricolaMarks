import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";

import { withStyles } from "@material-ui/core/styles";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Slide
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";

import ChangeLog from "./ChangeLog";

function Transition(props) {
  return <Slide direction="down" {...props} />;
}

function ShowHistory(props) {
  return (
    <div>
      <Typography
        variant="subtitle2"
        color="inherit"
        className={props.classes.flex}
      >
        Version {props.version} - ({props.date})
      </Typography>
      <Typography
        variant="caption"
        color="inherit"
        className={props.classes.flex}
      >
        <ul className={props.classes.historyList}>
          {props.changes.map(value => (
            <li>{value}</li>
          ))}
        </ul>
      </Typography>
    </div>
  );
}

const AboutDialog = props => {
  const { classes } = props;
  const version = process.env.REACT_APP_VERSION;

  const d = useDispatch();
  const isOpen = useSelector(state => store.getAppState(state, "isOpenAbout"));

  const onClose = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenAbout = false;
      })
    );
  }, []);
  console.log(isOpen);
  return (
    <div>
      <Dialog open={isOpen} onClose={onClose} TransitionComponent={Transition}>
        <AppBar className={classes.appBar}>
          <Toolbar>
            <IconButton color="inherit" onClick={onClose} aria-label="Close">
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" color="inherit" className={classes.flex}>
              About
            </Typography>
          </Toolbar>
        </AppBar>
        <DialogTitle id="alert-dialog-title">Agricola Marks</DialogTitle>
        <DialogContent style={{ height: 500 }}>
          <DialogContentText>
            Version {version}
            <Typography variant="h6" color="inherit" className={classes.flex}>
              Author
            </Typography>
            <a href="https://twitter.com/yan3?lang=ja">@yan3</a> (
            <a href="http://spielembryo.geo.jp/">SpielEmbryo</a>)
            <Typography variant="h6" color="inherit" className={classes.flex}>
              History
            </Typography>
            {ChangeLog.map(info => (
              <ShowHistory classes={classes} {...info} />
            ))}
            <Typography variant="h6" color="inherit" className={classes.flex}>
              License
            </Typography>
            Copyright (c) 2018 yan3 Released under the{" "}
            <a href="https://opensource.org/licenses/mit-license.php">
              MIT license
            </a>
          </DialogContentText>
        </DialogContent>
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
  historyList: {
    paddingLeft: theme.spacing.unit * 3
  }
});

export default withStyles(styles)(AboutDialog);
