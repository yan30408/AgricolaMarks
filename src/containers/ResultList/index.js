import React, {
  memo,
  useCallback,
  useState,
  forwardRef,
  useRef,
  useEffect
} from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { map } from "lodash";
import { makeStyles } from "@material-ui/core/styles";
import {
  IconButton,
  List,
  ListItem,
  Dialog,
  Toolbar,
  AppBar,
  Typography,
  Slide,
  TextField,
  ListItemAvatar,
  Avatar,
  ListItemText,
  InputAdornment,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  ListSubheader
} from "@material-ui/core";
import ArrowBackIcon from "@material-ui/icons/ArrowBackIos";
import RefreshIcon from "@material-ui/icons/Refresh";
import CancelIcon from "@material-ui/icons/Cancel";

import PlaysIcon from "@material-ui/icons/SportsEsports";
import WinsIcon from "@material-ui/icons/FormatListNumbered";
import WinRateIcon from "@material-ui/icons/ThumbUp";
import ScoreIcon from "@material-ui/icons/Grade";
import ScoreAveIcon from "@material-ui/icons/TrendingUp";

import ResultListListItem from "./ResultListListItem";
import ResultRecord from "./ResultRecord";

const Transition = forwardRef((props, ref) => {
  return <Slide direction="left" ref={ref} {...props} />;
});

const useStyles = makeStyles(theme => ({
  appBar: {
    position: "sticky"
  },
  flex: {
    flex: 1
  },
  subheader: {
    backgroundColor: "#cfd8dc",
    textAlign: "center",
    lineHeight: "30px"
  }
}));

const ResultList = props => {
  const classes = useStyles();
  const d = useDispatch();

  const open = useSelector(state =>
    store.getAppState(state, "isOpenResultList")
  );
  const dailyResultIds = useSelector(state => store.getDailyResultIds(state));
  const days = Object.keys(dailyResultIds)
    .sort()
    .reverse();

  const onClose = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenResultList = false;
      })
    );
  }, [d]);

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
    >
      <AppBar className={classes.appBar}>
        <Toolbar>
          <IconButton color="inherit" onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" color="inherit" className={classes.flex}>
            結果一覧
          </Typography>
        </Toolbar>
      </AppBar>
      <List>
        {days.map(day => (
          <>
            <ListSubheader className={classes.subheader}>{day}</ListSubheader>
            {dailyResultIds[day].map(resultId => (
              <ResultListListItem key={resultId} resultId={resultId} />
            ))}
          </>
        ))}
      </List>
      <ResultRecord />
    </Dialog>
  );
};

export default memo(ResultList);
