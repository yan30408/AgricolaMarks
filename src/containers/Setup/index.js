import React, { memo, useCallback, forwardRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { uniq } from "lodash";
import { makeStyles } from "@material-ui/core/styles";
import {
  IconButton,
  List,
  ListItem,
  Dialog,
  Toolbar,
  AppBar,
  Typography,
  Divider,
  Slide
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";

import PlayerForm from "./PlayerForm";
import { Colors } from "Constants";

const Transition = forwardRef((props, ref) => {
  return <Slide direction="down" ref={ref} {...props} />;
});

const useStyles = makeStyles({
  appBar: {
    position: "relative"
  },
  flex: {
    flex: 1
  }
});

const FullScreenDialog = props => {
  const classes = useStyles();
  const d = useDispatch();
  const isOpen = useSelector(state => store.getAppState(state, "isOpenSetup"));
  const recentPlayers = useSelector(state => store.getAppRecentPlayers(state));
  const validPlayers = useSelector(state => store.getValidPlayers(state));
  const onClose = useCallback(() => {
    // とりえあず最大20件
    const playerNames = validPlayers.map(player => player.name);
    const recPlayers = uniq([...playerNames, ...recentPlayers]).slice(0, 20);
    d(
      store.appPlayersMutate(players => {
        players.recent = recPlayers;
      })
    );
    d(
      store.appStateMutate(state => {
        state.isOpenSetup = false;
      })
    );
  }, [d, validPlayers, recentPlayers]);

  return (
    <Dialog
      fullScreen
      open={isOpen}
      onClose={onClose}
      TransitionComponent={Transition}
    >
      <AppBar className={classes.appBar}>
        <Toolbar>
          <IconButton color="inherit" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" color="inherit" className={classes.flex}>
            Setup Player Info
          </Typography>
        </Toolbar>
      </AppBar>
      <List>
        {Array(5)
          .fill(0)
          .map((_, index) => (
            <div
              key={index}
              style={{
                backgroundColor: Colors[Object.keys(Colors)[index]].sub
              }}
            >
              <ListItem>
                <PlayerForm index={index} />
              </ListItem>
              <Divider />
            </div>
          ))}
      </List>
    </Dialog>
  );
};

export default memo(FullScreenDialog);
