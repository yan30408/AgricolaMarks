import React, { memo } from "react";
import { useSelector } from "react-redux";
import store from "stores/interfaces";
import {
  Avatar,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography
} from "@mui/material";
import { Orders, Colors } from "Constants";

const ResultListItem = props => {
  const player = useSelector(state =>
    store.getAppCurrentPlayerById(state, props.uid)
  );
  if (!player) return null;

  const scoreTotal = props.score?.total ?? 0;
  const scoreInside = props.score?.inFarm ?? 0;
  const scoreOutside = props.score?.outside ?? 0;

  const ratingBefore =
    typeof props.ratingBefore === "number" ? props.ratingBefore : null;
  const ratingAfter =
    typeof props.ratingAfter === "number" ? props.ratingAfter : null;
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
      <ListItem style={{ backgroundColor: Colors[props.color]?.sub }} divider>
        <ListItemAvatar>
          <Avatar
            src={player.iconUrl}
            alt={player.name}
            style={{ backgroundColor: Colors[props.color]?.main }}
          >
            {player.name?.substr(0, 1)}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Typography variant="body1" noWrap>
              {player.name}
            </Typography>
          }
          secondary={Orders[player.order]}
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
      </ListItem>
    </div>
  );
};

export default memo(ResultListItem);
