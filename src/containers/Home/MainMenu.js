import React, { memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@material-ui/core/styles";
import {
  SwipeableDrawer,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar
} from "@material-ui/core";

const useStyles = makeStyles({
  flex: {
    flex: 1
  }
});

const MainMenu = props => {
  const classes = useStyles();
  const d = useDispatch();
  const open = useSelector(state => store.getAppState(state, "isOpenMenu"));
  const uid = useSelector(state => store.getAppState(state, "uid"));
  const isAnonymous = useSelector(state =>
    store.getAppState(state, "isAnonymous")
  );
  const displayName = useSelector(state =>
    store.getAppState(state, "displayName")
  );
  const photoUrl = useSelector(state => store.getAppState(state, "photoUrl"));

  const onClose = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenMenu = false;
      })
    );
  }, []);
  const onClickAbout = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenAbout = true;
      })
    );
  }, [d]);
  const onClickSetup = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenMenu = false;
        state.isOpenSetup = true;
      })
    );
  }, [d]);
  const onClickAllClear = useCallback(() => {
    d(
      store.appStateMutate(state => {
        //        state.isOpenMenu = false;
        state.isOpenAllClear = true;
      })
    );
  }, []);
  const onClickSignin = useCallback(() => {
    d(store.signInWithTwitter());
  }, []);

  return (
    <SwipeableDrawer
      anchor="left"
      open={open}
      onClose={onClose}
      // onClose={toggleDrawer(anchor, false)}
      // onOpen={toggleDrawer(anchor, true)}
    >
      <List>
        <ListItem>
          <ListItemAvatar>
            <Avatar src={photoUrl} />
          </ListItemAvatar>
          <ListItemText primary={displayName || "匿名ユーザー"} />
        </ListItem>
        <ListItem button divider onClick={onClickSignin}>
          <ListItemText primary="SIGNIN WITH TWITTER" />
        </ListItem>
        <ListItem button onClick={onClickSetup}>
          <ListItemText primary="SET UP" />
        </ListItem>
        <ListItem button onClick={onClickAllClear} divider>
          <ListItemText primary="ALL CLEAR" />
        </ListItem>
        <ListItem button onClick={onClickAbout} divider>
          <ListItemText primary="ABOUT" />
        </ListItem>
      </List>
    </SwipeableDrawer>
  );
};

export default memo(MainMenu);
