import React, {
  memo,
  useCallback,
  useState,
  forwardRef,
  useRef,
  useEffect,
  useMemo
} from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
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
  InputAdornment,
  BottomNavigation,
  BottomNavigationAction
} from "@material-ui/core";
import ArrowBackIcon from "@material-ui/icons/ArrowBackIos";
import CancelIcon from "@material-ui/icons/Cancel";
import PlaysIcon from "@material-ui/icons/SportsEsports";
import WinsIcon from "@material-ui/icons/FormatListNumbered";
import WinRateIcon from "@material-ui/icons/ThumbUp";
import ScoreIcon from "@material-ui/icons/Grade";
import ScoreAveIcon from "@material-ui/icons/TrendingUp";
import BakushiIcon from "@material-ui/icons/FlashOn";

import UserListItem from "./UserListItem";
import PlayerStatistics from "containers/PlayerStatistics";

const Transition = forwardRef((props, ref) => {
  return <Slide direction="left" ref={ref} {...props} />;
});

const useStyles = makeStyles(theme => ({
  appBar: {
    position: "sticky"
  },
  list: {
    paddingBottom: "60px"
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
  const [playerNameText, setPlayerNameText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statisticsType, setStatisticsType] = useState("playNum");
  const [isOpenPlayerStatistics, setIsOpenPlayerStatistics] = useState(false);
  const [isOpenPlayerStatisticsId, setIsOpenPlayerStatisticsId] = useState("");
  const timer = useRef(null);

  const open = useSelector(state =>
    store.getAppState(state, "isOpenPlayerList")
  );
  const filteredUserIds = useSelector(state =>
    store.getFiltterdUserIds(state, { searchText })
  );
  const allStatistics = useSelector(state => store.getAllUserStatistics(state));
  const sortedUserIds = useMemo(() => {
    if (Object.keys(allStatistics).length > 0) {
      return filteredUserIds
        .filter(id => allStatistics[id])
        .sort((a, b) => {
          if (statisticsType === "highestScore") {
            return (
              allStatistics[b][statisticsType].score -
              allStatistics[a][statisticsType].score
            );
          } else if (statisticsType === "lowestScore") {
            if (allStatistics[a]["playNum"] === 0) {
              return 1;
            } else if (allStatistics[b]["playNum"] === 0) {
              return -1;
            } else {
              return (
                allStatistics[a][statisticsType].score -
                allStatistics[b][statisticsType].score
              );
            }
          } else {
            return (
              allStatistics[b][statisticsType] -
              allStatistics[a][statisticsType]
            );
          }
        });
    } else {
      return filteredUserIds;
    }
  }, [statisticsType, filteredUserIds, allStatistics]);

  const onClose = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenPlayerList = false;
      })
    );
  }, [d]);
  const onCancel = useCallback(() => {
    setPlayerNameText("");
    setSearchText("");
  }, []);
  const onChange = useCallback(e => {
    const text = e.currentTarget.value;
    setPlayerNameText(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSearchText(text);
    }, 500);
  }, []);
  const onSelect = useCallback(id => {
    setIsOpenPlayerStatistics(true);
    setIsOpenPlayerStatisticsId(id);
  }, []);
  const onDeselect = useCallback(id => {
    setIsOpenPlayerStatistics(false);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);

  return (
    <>
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
        <List className={classes.list}>
          <ListItem>
            <TextField
              label="プレイヤー名"
              variant="outlined"
              fullWidth
              value={playerNameText}
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
          {sortedUserIds.map(uid => (
            <UserListItem
              key={uid}
              uid={uid}
              statisticsType={statisticsType}
              onSelect={onSelect}
            />
          ))}
        </List>
        <BottomNavigation
          value={statisticsType}
          onChange={(_, value) => setStatisticsType(value)}
          showLabels
          className={classes.bottomNav}
        >
          <BottomNavigationAction
            label="プレイ"
            value="playNum"
            icon={<PlaysIcon />}
          />
          <BottomNavigationAction
            label="勝率"
            value="winRate"
            icon={<WinRateIcon />}
          />
          <BottomNavigationAction
            label="平均点"
            value="averageScore"
            icon={<ScoreAveIcon />}
          />
          <BottomNavigationAction
            label="高得点"
            value="highestScore"
            icon={<ScoreIcon />}
          />
          <BottomNavigationAction
            label="爆死"
            value="lowestScore"
            icon={<BakushiIcon />}
          />
        </BottomNavigation>
      </Dialog>
      <PlayerStatistics
        open={isOpenPlayerStatistics}
        uid={isOpenPlayerStatisticsId}
        onClose={onDeselect}
      />
    </>
  );
};

export default memo(PlayerList);
