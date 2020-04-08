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
  InputAdornment,
  BottomNavigation,
  BottomNavigationAction,
  Paper
} from "@material-ui/core";
import ArrowBackIcon from "@material-ui/icons/ArrowBackIos";
import RefreshIcon from "@material-ui/icons/Refresh";
import CancelIcon from "@material-ui/icons/Cancel";

import PlaysIcon from "@material-ui/icons/SportsEsports";
import WinsIcon from "@material-ui/icons/FormatListNumbered";
import WinRateIcon from "@material-ui/icons/ThumbUp";
import ScoreIcon from "@material-ui/icons/Grade";
import ScoreAveIcon from "@material-ui/icons/TrendingUp";

import UserListItem from "./UserListItem";

const Transition = forwardRef((props, ref) => {
  return <Slide direction="right" ref={ref} {...props} />;
});

const useStyles = makeStyles(theme => ({
  appBar: {
    position: "sticky"
  },
  bottomNav: {
    position: "fixed",
    top: "auto",
    bottom: 0,
    width: "100%",
    backgroundColor: "#DDDDDD"
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

const PlayerList = props => {
  const classes = useStyles();
  const d = useDispatch();
  const [searchText, setSearchText] = useState("");
  const [navigation, setNavigation] = useState("plays");
  const timer = useRef(null);

  const open = useSelector(state =>
    store.getAppState(state, "isOpenPlayerList")
  );
  const uid = useSelector(state => store.getAppState(state, "uid"));
  const validPlayers = useSelector(state => store.getValidPlayers(state));
  const filteredUserIds = useSelector(state =>
    store.getFiltterdUserIds(state, { searchText: searchText })
  );

  const onClose = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenPlayerList = false;
      })
    );
  }, [d]);
  const onCancel = useCallback(() => {
    setSearchText("");
  }, []);
  const onChange = useCallback(e => {
    const text = e.currentTarget.value;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSearchText(text);
    }, 100);
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
            プレイヤー一覧
          </Typography>
        </Toolbar>
      </AppBar>
      <List>
        <ListItem>
          <TextField
            label="プレイヤー名"
            variant="outlined"
            fullWidth
            value={searchText}
            onChange={onChange}
            placeholder="プレイヤーの検索"
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
        {filteredUserIds.map(uid => (
          <UserListItem key={uid} uid={uid} />
        ))}
      </List>
      <BottomNavigation
        value={navigation}
        onChange={(_, value) => setNavigation(value)}
        showLabels
        className={classes.bottomNav}
      >
        　
        <BottomNavigationAction
          label="プレイ"
          value="plays"
          icon={<PlaysIcon />}
        />
        <BottomNavigationAction
          label="勝ち数"
          value="wins"
          icon={<WinsIcon />}
        />
        <BottomNavigationAction
          label="勝率"
          value="winRate"
          icon={<WinRateIcon />}
        />
        <BottomNavigationAction
          label="スコア"
          value="scores"
          icon={<ScoreIcon />}
        />
        <BottomNavigationAction
          label="平均点"
          value="averageScore"
          icon={<ScoreAveIcon />}
        />
      </BottomNavigation>
    </Dialog>
  );
};

export default memo(PlayerList);
