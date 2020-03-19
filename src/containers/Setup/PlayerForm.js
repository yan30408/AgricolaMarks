import React, { memo, useCallback, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@material-ui/core/styles";
import { IconButton, TextField, Menu, InputAdornment } from "@material-ui/core";
import PlayersIcon from "@material-ui/icons/FolderShared";

import RecentPlayerListItem from "./RecentPlayerListItem";

const useStyles = makeStyles(theme => ({
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1)
  }
}));

const PlayerForm = props => {
  const { index } = props;
  const classes = useStyles();
  const ITEM_HEIGHT = 48;
  const anchorEl = useRef(null);
  const [open, setOpen] = useState(false);
  const [playerIndex, setPlayerIndex] = useState(0);
  const d = useDispatch();

  const name = useSelector(state => store.getAppCurrentPlayer(state, index))
    ?.name;
  const recentPlayers = useSelector(state => store.getAppRecentPlayers(state));
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
  const onShowRecentPlayers = useCallback(() => {
    if (recentPlayers.length > 0) {
      setPlayerIndex(index);
      setOpen(true);
    }
  }, [index, recentPlayers.length]);
  const onHideRecentPlayers = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <TextField
      label="Name"
      className={classes.textField}
      value={name}
      onChange={onChangeName}
      margin="normal"
      variant="outlined"
      fullWidth
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton ref={anchorEl} onClick={onShowRecentPlayers}>
              <PlayersIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl.current}
              open={open}
              onClose={onHideRecentPlayers}
              PaperProps={{
                style: {
                  maxHeight: ITEM_HEIGHT * 5.5,
                  width: 200
                }
              }}
            >
              {recentPlayers.map((name, rpIndex) => (
                <RecentPlayerListItem
                  key={rpIndex}
                  name={name}
                  playerIndex={playerIndex}
                  onClose={onHideRecentPlayers}
                />
              ))}
            </Menu>
          </InputAdornment>
        )
      }}
    />
  );
};

export default memo(PlayerForm);
