import React, { memo, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@mui/styles";
import {
  Avatar,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemIcon,
  Typography
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardIos";

import { Colors } from "Constants";
import { getAdjustedRating, formatAdjustedRating } from "./ratingUtils";

const useStyles = makeStyles({
  spacer: {
    flexGrow: 1
  },
  arrowForward: {
    paddingLeft: "8px",
    minWidth: 0
  }
});

const DEFAULT_MODE = "classic";
const MIN_REQUIRED_PLAYS = 10;

const formatAverageScore = (scoreTotal, playCount) => {
  if (!playCount || playCount < MIN_REQUIRED_PLAYS) return "-";
  const average = scoreTotal / playCount;
  return `${average.toFixed(1)} pt`;
};

const UserListItem = props => {
  const classes = useStyles();

  const user = useSelector(state => store.getUserById(state, props.uid));
  const createdByTwitterId = useSelector(state =>
    store.getUserById(state, user.createdBy)
  )?.twitterId;
  const createdBy = createdByTwitterId
    ? `registered by ${createdByTwitterId}`
    : null;
  const summary = useSelector(state =>
    store.getUserStatsSummaryById(state, props.uid)
  );
  const modeKey = props.mode || DEFAULT_MODE;
  const modeStats = summary?.modes?.[modeKey] || null;
  const favoriteColor = summary?.favoriteColor ?? null;

  const value = useMemo(() => {
    if (!modeStats) return "-";
    switch (props.statisticsType) {
      case "playCount":
        return `${modeStats.playCount || 0} 回`;
      case "averageScore":
        return formatAverageScore(
          modeStats.scoreTotal || 0,
          modeStats.playCount || 0
        );
      case "highestScore":
        return modeStats.highestScore
          ? `${modeStats.highestScore.score} pt`
          : "-";
      case "lowestScore":
        return modeStats.lowestScore
          ? `${modeStats.lowestScore.score} pt`
          : "-";
      case "rating":
        return formatAdjustedRating(getAdjustedRating(modeStats));
      default:
        return "-";
    }
  }, [props.statisticsType, modeStats]);

  const onSelect = useCallback(() => {
    props.onSelect(props.uid);
  }, [props.onSelect, props.uid]);

  if (!user?.displayName) return null;

  return (
    <>
      <ListItem
        button
        onClick={onSelect}
        divider
        style={{ backgroundColor: Colors[favoriteColor]?.sub }}
      >
        <ListItemAvatar>
          <Avatar
            src={user.photoUrl}
            alt={user.displayName}
            style={{ backgroundColor: Colors[favoriteColor]?.main }}
          >
            {user.displayName.substr(0, 1)}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={<Typography noWrap>{user.displayName}</Typography>}
          secondary={user.twitterId || createdBy || "Anonymous"}
        />
        <div className={classes.spacer} />
        <Typography variant="subtitle2" noWrap style={{ minWidth: "46px" }}>
          {value}
        </Typography>
        <ListItemIcon className={classes.arrowForward}>
          <ArrowForwardIcon />
        </ListItemIcon>
      </ListItem>
    </>
  );
};

export default memo(UserListItem);
