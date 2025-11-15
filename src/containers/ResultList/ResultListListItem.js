import React, { memo, useCallback, useRef, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@mui/styles";
import {
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardIos";

import { format } from "date-fns";

const toDate = value => {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    return value.toDate();
  }
  if (value?.seconds !== undefined) {
    return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6);
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

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

  const result = useSelector(state =>
    store.getResultById(state, props.resultId)
  );

  const onSelect = useCallback(() => {
    props.onSelect(props.resultId);
  }, [props.onSelect, props.resultId]);
  if (!result) return null;
  const playedAtDate = toDate(result.playedAt || result.date);
  const time = playedAtDate ? format(playedAtDate, "HH:mm") : "";

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
              {result.results.map((player, index) => {
                const key = player.uid || index;
                return (
                  <PlayerName
                    key={`player-${key}`}
                    uid={player.uid}
                    index={index}
                  />
                );
              })}
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
