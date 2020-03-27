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
  ListItemIcon,
  Avatar
} from "@material-ui/core";
import ArrowForwardIcon from "@material-ui/icons/ArrowForwardIos";

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
  const myProfile = useSelector(state => store.getUserById(state, uid));

  const onClose = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenMenu = false;
      })
    );
  }, [d]);
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
        state.isOpenAllClear = true;
      })
    );
  }, [d]);
  const onClickSignin = useCallback(() => {
    if (!isAnonymous && uid) {
      d(store.signOut());
    } else {
      d(store.signInWithTwitter());
    }
  }, [d, uid, isAnonymous]);

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
            <Avatar src={myProfile.photoUrl} />
          </ListItemAvatar>
          <ListItemText
            primary={myProfile.displayName || "匿名ユーザー"}
            secondary={myProfile.twitterId || "Anonymous"}
          />
        </ListItem>
        <ListItem button divider onClick={onClickSignin}>
          <ListItemText
            primary={!isAnonymous && uid ? "ログアウト" : "ログイン"}
          />
        </ListItem>
        <ListItem button onClick={onClickSetup}>
          <ListItemText primary="参加プレイヤー設定" />
          <ListItemIcon>
            <ArrowForwardIcon />
          </ListItemIcon>
        </ListItem>
        <ListItem button onClick={onClickAllClear} divider>
          <ListItemText primary="現在の入力を全て消す" />
        </ListItem>
        <ListItem button onClick={onClickAbout} divider>
          <ListItemText primary="このアプリについて" />
        </ListItem>
      </List>
    </SwipeableDrawer>
  );
};

export default memo(MainMenu);
