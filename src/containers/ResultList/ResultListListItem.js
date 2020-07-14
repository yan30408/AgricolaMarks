import React, { memo, useCallback, useRef, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@material-ui/core/styles";
import {
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography
} from "@material-ui/core";
import ArrowForwardIcon from "@material-ui/icons/ArrowForwardIos";

import { format } from "date-fns";

const useStyles = makeStyles({
  spacer: {
    flexGrow: 1
  },
  arrowForward: {
    minWidth: 0
  }
});

const ResultListListItem = props => {
  const classes = useStyles();
  const d = useDispatch();

  const users = useSelector(state => store.getUsers(state));
  const result = useSelector(state =>
    store.getResultById(state, props.resultId)
  );
  const playerNames = useMemo(() => {
    return result.results.reduce((acc, player) => {
      return (
        acc +
        (acc.length > 0 ? ", " : "") +
        (users[player.uid]?.displayName || "Anonymous")
      );
    }, "");
  }, [users, result]);

  const onSelect = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenResultRecord = true;
        state.openResultRecordId = props.resultId;
      })
    );
  }, [d]);
  if (!result) return null;
  const time = format(
    new Date(result.date.seconds * 1000 + result.date.nanoseconds / 1000000),
    "HH:mm"
  );

  return (
    <>
      <ListItem button onClick={onSelect} divider>
        <ListItemText
          primary={<Typography noWrap>{time}</Typography>}
          secondary={
            <Typography
              noWrap
              display="block"
              variant="caption"
              color="textSecondary"
            >
              {playerNames}
            </Typography>
          }
        />
        <div className={classes.spacer} />
        <ListItemIcon className={classes.arrowForward}>
          <ArrowForwardIcon />
        </ListItemIcon>
      </ListItem>
    </>
  );
};

export default memo(ResultListListItem);
