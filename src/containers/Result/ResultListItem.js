import React, { memo } from "react";
import { useSelector } from "react-redux";
import store from "stores/interfaces";
import { ListItem, ListItemText, Typography } from "@material-ui/core";
import { Orders } from "Constants";

const ResultListItem = props => {
  const player = useSelector(state =>
    store.getAppCurrentPlayerById(state, props.id)
  );
  return (
    <div>
      <ListItem style={{ backgroundColor: player.color.sub }} divider>
        {/*
        <Avatar>
          <ImageIcon />
        </Avatar>
        */}
        <ListItemText
          primary={<Typography variant="h6">{player.name}</Typography>}
          secondary={Orders[player.order]}
          style={{ width: 100 }}
        />
        <ListItemText
          secondary={
            <Typography variant="inherit" align="left">
              {`[ ${props.score.inFarm} + ${props.score.outside} ]`}
            </Typography>
          }
        />
        <ListItemText secondary={" → "} />
        <ListItemText
          primary={<Typography variant="h5">{props.score.total}</Typography>}
        />
      </ListItem>
    </div>
  );
};

export default memo(ResultListItem);
