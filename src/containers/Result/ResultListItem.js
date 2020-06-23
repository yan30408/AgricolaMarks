import React, { memo } from "react";
import { useSelector } from "react-redux";
import store from "stores/interfaces";
import {
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography
} from "@material-ui/core";
import { Orders, Colors } from "Constants";

const ResultListItem = props => {
  const player = useSelector(state =>
    store.getAppCurrentPlayerById(state, props.uid)
  );
  const colorId = useSelector(state =>
    store.getAppCurrentPlayerKey(state, props.uid)
  );
  if (!player) return null;

  return (
    <div>
      <ListItem style={{ backgroundColor: Colors[colorId]?.sub }} divider>
        <ListItemAvatar>
          <Avatar src={player.iconUrl} />
        </ListItemAvatar>
        <ListItemText
          primary={
            <Typography variant="h6" noWrap>
              {player.name}
            </Typography>
          }
          secondary={Orders[player.order]}
          style={{ flex: 5 }}
        />
        <ListItemText
          secondary={
            <Typography variant="inherit" align="left">
              {`[ ${props.score.inFarm} + ${props.score.outside} ]`}
            </Typography>
          }
        />
        <ListItemText secondary={"→"} />
        <ListItemText
          primary={<Typography variant="h5">{props.score.total}</Typography>}
        />
      </ListItem>
    </div>
  );
};

export default memo(ResultListItem);
