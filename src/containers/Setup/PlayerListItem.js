import React, { memo, useCallback, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@material-ui/core/styles";
import {
  IconButton,
  TextField,
  Menu,
  InputAdornment,
  Avatar,
  ListItem,
  ListItemAvatar,
  ListItemText
} from "@material-ui/core";
import PlayersIcon from "@material-ui/icons/FolderShared";
import PlayerColorSelect from "./PlayerColorSelect";

const useStyles = makeStyles(theme => ({
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1)
  },
  margin: {
    margin: theme.spacing(1)
  }
}));

const PlayerListItem = props => {
  const { index } = props;
  const classes = useStyles();
  const d = useDispatch();

  const player = useSelector(state => store.getAppCurrentPlayer(state, index))
    ?.name;
  const user = useSelector(state => store.getAppCurrentPlayer(state, index))
    ?.name;
  const onChangeName = useCallback(
    event => {
      d(
        store.appPlayersMutate(players => {
          players.current[index].name = event.target.value.substr(0, 10);
        })
      );
    },
    [d, index]
  );
  const onShowPlayerSelect = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenPlayerSelect = true;
      })
    );
  }, [d]);

  return (
    <ListItem button>
      <ListItemAvatar>
        <Avatar src={player.photoUrl} />
      </ListItemAvatar>
      <ListItemText
        primary={player.displayName}
        secondary={player.twitterId || "Anonymous"}
      ></ListItemText>
      <PlayerColorSelect />
    </ListItem>
  );
};

export default memo(PlayerListItem);
