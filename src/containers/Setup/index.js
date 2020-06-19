import React, {
  memo,
  useCallback,
  useState,
  forwardRef,
  useRef,
  useEffect
} from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { map } from "lodash";
import { makeStyles } from "@material-ui/core/styles";
import {
  IconButton,
  List,
  ListItem,
  Dialog,
  Toolbar,
  AppBar,
  Typography,
  Slide,
  TextField,
  ListItemAvatar,
  Avatar,
  ListItemText,
  InputAdornment
} from "@material-ui/core";
import ArrowBackIcon from "@material-ui/icons/ArrowBackIos";
import RefreshIcon from "@material-ui/icons/Refresh";
import AddIcon from "@material-ui/icons/Add";
import CancelIcon from "@material-ui/icons/Cancel";

import AlertDialog from "components/AlertDialog";
import UserListItem from "./UserListItem";

const Transition = forwardRef((props, ref) => {
  return <Slide direction="left" ref={ref} {...props} />;
});

const useStyles = makeStyles(theme => ({
  appBar: {
    position: "sticky"
  },
  flex: {
    flex: 1
  },
  button: {
    margin: theme.spacing(1)
  },
  rightIcon: {
    marginLeft: theme.spacing(1)
  },
  fab: {
    position: "fixed",
    bottom: theme.spacing(2),
    right: theme.spacing(2)
  }
}));

const FullScreenDialog = props => {
  const classes = useStyles();
  const d = useDispatch();
  const [openReset, setOpenReset] = useState(false);
  const [playerNameText, setPlayerNameText] = useState("");
  const [searchText, setSearchText] = useState("");
  const timer = useRef(null);

  const open = useSelector(state => store.getAppState(state, "isOpenSetup"));
  const uid = useSelector(state => store.getAppState(state, "uid"));
  const validPlayers = useSelector(state => store.getValidPlayers(state));
  const filteredUserIds = useSelector(state =>
    store.getFiltterdUserIds(state, { searchText })
  );

  const onClose = useCallback(() => {
    onCancel();
    const playerIds = map(validPlayers, "uid");
    if (playerIds.length > 0) {
      d(store.appPlayersUpdateRecent(playerIds));
    }
    d(
      store.appStateMutate(state => {
        state.isOpenSetup = false;
      })
    );
  }, [d, validPlayers]);
  const onClickReset = useCallback(() => {
    setOpenReset(true);
  }, []);
  const onCloseReset = useCallback(() => {
    setOpenReset(false);
  }, []);
  const onClickResetOK = useCallback(() => {
    setOpenReset(false);
    d(
      store.appStateMutate(state => {
        state.currentOrder = 0;
      })
    );
    d(store.appPlayersInit);
    d(store.appResultsInit);
  }, [d]);
  const onCancel = useCallback(() => {
    setPlayerNameText("");
    setSearchText("");
  }, []);
  const onAdd = useCallback(() => {
    d(
      store.addUser({
        displayName: playerNameText,
        // photoUrl: result.user.providerData[0].photoURL,
        // twitterId: result.additionalUserInfo.username
        createdBy: uid
      })
    );
    onCancel();
  }, [d, playerNameText, uid]);
  const onChange = useCallback(e => {
    const text = e.currentTarget.value;
    setPlayerNameText(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSearchText(text);
    }, 500);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
    >
      <AppBar className={classes.appBar}>
        <Toolbar>
          <IconButton color="inherit" onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" color="inherit" className={classes.flex}>
            参加プレイヤー設定
          </Typography>
          <IconButton color="inherit" onClick={onClickReset}>
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <List>
        <ListItem>
          <TextField
            label="プレイヤー名"
            variant="outlined"
            fullWidth
            value={playerNameText}
            onChange={onChange}
            placeholder="プレイヤーの検索または新規登録"
            InputLabelProps={{
              shrink: true
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={onCancel} edge="end">
                    <CancelIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </ListItem>
        {playerNameText !== "" ? (
          <ListItem button onClick={onAdd} divider>
            <ListItemAvatar>
              <Avatar>
                <AddIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary="上記の名前で新規登録する" />
          </ListItem>
        ) : null}
        {playerNameText !== "" && filteredUserIds.length > 0 ? (
          <ListItem>
            <ListItemText secondary={"もしかして・・・この人ですか？"} />
          </ListItem>
        ) : null}
        {filteredUserIds.map(uid => (
          <UserListItem key={uid} uid={uid} />
        ))}
      </List>
      <AlertDialog
        title="Reset player info ?"
        isOpen={openReset}
        onClose={onCloseReset}
        onClickOk={onClickResetOK}
      >
        参加プレイヤーをリセットしますか？
      </AlertDialog>
    </Dialog>
  );
};

export default memo(FullScreenDialog);
