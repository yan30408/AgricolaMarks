import React, { memo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@material-ui/core/styles";
import {
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  Typography
} from "@material-ui/core";
import ArrowForwardIcon from "@material-ui/icons/ArrowForwardIos";

import { Orders, Colors } from "Constants";

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
  const d = useDispatch();

  const player = useSelector(state => store.getUserById(state, props.uid));

  const onSelect = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenPlayerStatics = true;
        state.openPlayerStaticsId = props.uid;
      })
    );
  }, [d]);

  if (!player) return null;

  return (
    <div>
      <ListItem
        button
        onClick={onSelect}
        style={{ backgroundColor: Colors[props.color]?.sub }}
        divider
      >
        <ListItemAvatar>
          <Avatar src={player.photoUrl} />
        </ListItemAvatar>
        <ListItemText
          primary={
            <Typography variant="h6" noWrap>
              {player.displayName}
            </Typography>
          }
          secondary={Orders[props.order]}
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
        <ListItemIcon className={classes.arrowForward}>
          <ArrowForwardIcon />
        </ListItemIcon>
      </ListItem>
    </div>
  );
};

export default memo(ResultListItem);
