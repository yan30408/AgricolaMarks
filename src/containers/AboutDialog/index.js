import React, { memo, useCallback, forwardRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@material-ui/core/styles";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Dialog,
  DialogContent,
  DialogTitle,
  Slide
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";

import ChangeLog from "./ChangeLog";

const Transition = forwardRef((props, ref) => {
  return <Slide direction="down" ref={ref} {...props} />;
});

const useStyles = makeStyles(theme => ({
  appBar: {
    position: "relative"
  },
  flex: {
    flex: 1
  },
  historyList: {
    paddingLeft: theme.spacing(3)
  }
}));

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
          {props.changes.map((value, index) => (
            <li key={index}>{value}</li>
          ))}
        </ul>
      </Typography>
    </div>
  );
}

const AboutDialog = props => {
  const classes = useStyles();
  const version = process.env.REACT_APP_VERSION;

  const d = useDispatch();
  const isOpen = useSelector(state => store.getAppState(state, "isOpenAbout"));

  const onClose = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenAbout = false;
      })
    );
  }, [d]);

  return (
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
      <DialogTitle id="alert-dialog-title">
        Agricola Marks - v{version}
      </DialogTitle>
      <DialogContent style={{ height: 500 }}>
        <Typography variant="h6" color="inherit" className={classes.flex}>
          Author
        </Typography>
        <a href="https://twitter.com/yan3">@yan3</a> (
        <a href="http://spielembryo.geo.jp/">SpielEmbryo</a>)
        <Typography variant="h6" color="inherit" className={classes.flex}>
          License
        </Typography>
        Copyright (c) 2018 yan3
        <br />
        Released under the{" "}
        <a href="https://opensource.org/licenses/mit-license.php">
          MIT license
        </a>
        <Typography variant="h6" color="inherit" className={classes.flex}>
          History
        </Typography>
        {ChangeLog.map(info => (
          <ShowHistory key={info.version} classes={classes} {...info} />
        ))}
      </DialogContent>
    </Dialog>
  );
};

export default memo(AboutDialog);
