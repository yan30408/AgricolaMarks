import React, { useCallback, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { withStyles } from "@material-ui/core/styles";
import {
  IconButton,
  TextField,
  Menu,
  MenuItem,
  InputAdornment
} from "@material-ui/core";
import PlayersIcon from "@material-ui/icons/FolderShared";

const PlayerForm = props => {
  const { classes, index } = props;
  const ITEM_HEIGHT = 48;
  const anchorEl = useRef(null);
  const [open, setOpen] = useState(false);
  const [playerIndex, setPlayerIndex] = useState(0);
  const d = useDispatch();

  const name = useSelector(state => store.getAppCurrentPlayers(state, index));
  const recentPlayers = useSelector(state => store.getAppRecentPlayers(state));

  const onChangeName = useCallback((event, index) => {
    d(
      store.appPlayersMutate(players => {
        players.current[index].name = event.target.value.substr(0, 10);
      })
    );
  }, []);
  const onShowRecentPlayers = useCallback(
    index => {
      if (recentPlayers.length > 0) {
        setPlayerIndex(index);
        setOpen(true);
      }
    },
    [recentPlayers.length]
  );
  const onHideRecentPlayers = useCallback(() => {
    setOpen(false);
  }, []);
  const onChoseRecentPlayer = useCallback(
    index => {
      setOpen(false);
      d(
        store.appPlayersMutate(players => {
          players.current[playerIndex].name = recentPlayers[index];
        })
      );
    },
    [playerIndex, recentPlayers]
  );

  return (
    <TextField
      id="outlined-name"
      label="Name"
      className={classes.textField}
      value={name}
      onChange={event => onChangeName(event, index)}
      margin="normal"
      variant="outlined"
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton ref={anchorEl} onClick={onShowRecentPlayers(index)}>
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
                <MenuItem key={name} onClick={onChoseRecentPlayer(rpIndex)}>
                  {name}
                </MenuItem>
              ))}
            </Menu>
          </InputAdornment>
        )
      }}
    />
  );
};

const styles = theme => ({
  appBar: {
    position: "relative"
  },
  flex: {
    flex: 1
  },
  container: {
    display: "flex",
    flexWrap: "wrap",
    padding: "60px 0px"
  },
  textField: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit
  },
  menu: {
    width: 50
  }
});
export default withStyles(styles)(PlayerForm);
