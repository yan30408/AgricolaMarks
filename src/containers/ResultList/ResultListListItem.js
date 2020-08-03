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

const PlayerName = props => {
  const user = useSelector(state => store.getUserById(state, props.uid));
  return (
    <>
      {props.index !== 0 ? ", " : ""}
      {user.displayName || "Anonymous"}
    </>
  );
};

const ResultListListItem = props => {
  const classes = useStyles();
  const d = useDispatch();

  const result = useSelector(state =>
    store.getResultById(state, props.resultId)
  );

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
              {result.results.map((player, index) => (
                <PlayerName uid={player.uid} index={index} />
              ))}
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
