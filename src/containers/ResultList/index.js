import React, { memo, useCallback, useState, forwardRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@material-ui/core/styles";
import {
  IconButton,
  List,
  Dialog,
  Toolbar,
  AppBar,
  Typography,
  Slide,
  ListSubheader
} from "@material-ui/core";
import ArrowBackIcon from "@material-ui/icons/ArrowBackIos";

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
  const [isOpenResult, setIsOpenResult] = useState(false);
  const [isOpenResultId, setIsOpenResultId] = useState("");

  const open = useSelector(state =>
    store.getAppState(state, "isOpenResultList")
  );
  const dailyResultIds = useSelector(state =>
    store.getSortedDailyResultIds(state)
  );
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
  const onSelect = useCallback(id => {
    setIsOpenResult(true);
    setIsOpenResultId(id);
  }, []);
  const onDeselect = useCallback(id => {
    setIsOpenResult(false);
  }, []);

  return (
    <>
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
                <ResultListListItem
                  key={resultId}
                  resultId={resultId}
                  onSelect={onSelect}
                />
              ))}
            </>
          ))}
        </List>
      </Dialog>
      <ResultRecord
        open={isOpenResult}
        resultId={isOpenResultId}
        onClose={onDeselect}
      />
    </>
  );
};

export default memo(ResultList);
