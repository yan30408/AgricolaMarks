import React, { memo, useCallback } from "react";
import { useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@mui/styles";
import {
  Avatar,
  ListItem,
  ListItemAvatar,
  ListItemIcon,
  ListItemText,
  Typography
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardIos";

import { Orders, Colors } from "Constants";
import { toEloRating } from "containers/PlayerList/ratingUtils";

const useStyles = makeStyles({
  spacer: {
    flexGrow: 1
  },
  arrowForward: {
    minWidth: 0
  }
});

const ResultListItem = props => {
  const classes = useStyles();
  const player = useSelector(state => store.getUserById(state, props.uid));

  const onSelect = useCallback(() => {
    props.onSelect(props.uid);
  }, [props.onSelect, props.uid]);

  if (!player) return null;

  const scoreTotal = props.score?.total ?? 0;
  const scoreInside = props.score?.inFarm ?? 0;
  const scoreOutside = props.score?.outside ?? 0;

  const ratingBefore =
    typeof props.ratingBefore === "number"
      ? toEloRating(props.ratingBefore)
      : null;
  const ratingAfter =
    typeof props.ratingAfter === "number"
      ? toEloRating(props.ratingAfter)
      : null;
  const ratingDelta =
    ratingAfter !== null && ratingBefore !== null
      ? ratingAfter - ratingBefore
      : null;
  const ratingDeltaLabel =
    ratingDelta === null
      ? "-"
      : ratingDelta > 0
      ? `+${ratingDelta}`
      : `${ratingDelta}`;
  const deltaColor =
    ratingDelta === null
      ? "textSecondary"
      : ratingDelta > 0
      ? "primary"
      : ratingDelta < 0
      ? "error"
      : "textSecondary";
  const ratingLabel = ratingAfter !== null ? String(ratingAfter) : "-";

  return (
    <div>
      <ListItem
        button
        onClick={onSelect}
        style={{ backgroundColor: Colors[props.color]?.sub }}
        divider
      >
        <ListItemAvatar>
          <Avatar
            src={player.photoUrl}
            alt={player.displayName}
            style={{ backgroundColor: Colors[props.color]?.main }}
          >
            {player.displayName?.substr(0, 1)}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Typography variant="body1" noWrap>
              {player.displayName}
            </Typography>
          }
          secondary={Orders[props.order]}
          style={{ flex: 3 }}
        />
        <ListItemText
          style={{ flex: 4 }}
          primary={
            <Typography variant="body1" align="center" color="textSecondary">
              {ratingLabel}
            </Typography>
          }
          secondary={
            <Typography variant="body2" align="center" color={deltaColor}>
              {ratingDeltaLabel}
            </Typography>
          }
        />
        <ListItemText
          style={{ flex: 3 }}
          primary={
            <Typography variant="h5" align="center">
              {scoreTotal}
            </Typography>
          }
          secondary={
            <Typography variant="body2" align="center" color="textSecondary">
              {`[ ${scoreInside} + ${scoreOutside} ]`}
            </Typography>
          }
        />
        <ListItemIcon className={classes.arrowForward}>
          <ArrowForwardIcon />
        </ListItemIcon>
      </ListItem>
    </div>
  );
};

export default memo(ResultListItem);
