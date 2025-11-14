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
import { makeStyles } from "@mui/styles";
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
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackIos";
import CancelIcon from "@mui/icons-material/Cancel";
import PlaysIcon from "@mui/icons-material/SportsEsports";
import ScoreIcon from "@mui/icons-material/Grade";
import ScoreAveIcon from "@mui/icons-material/TrendingUp";
import BakushiIcon from "@mui/icons-material/FlashOn";
import RatingIcon from "@mui/icons-material/Leaderboard";

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

const DEFAULT_MODE = "classic";
const MIN_REQUIRED_PLAYS = 10;

const getAverageScore = stats => {
  if (!stats || !stats.playCount || stats.playCount < MIN_REQUIRED_PLAYS) {
    return 0;
  }
  return stats.scoreTotal / stats.playCount;
};

const compareStatistics = (a, b, type) => {
  switch (type) {
    case "playCount":
      return (b?.playCount || 0) - (a?.playCount || 0);
    case "rating":
      return (
        (b?.rating ?? Number.NEGATIVE_INFINITY) -
        (a?.rating ?? Number.NEGATIVE_INFINITY)
      );
    case "averageScore":
      return getAverageScore(b) - getAverageScore(a);
    case "highestScore":
      return (b?.highestScore?.score || 0) - (a?.highestScore?.score || 0);
    case "lowestScore": {
      const aScore =
        a?.playCount && a?.lowestScore
          ? a.lowestScore.score
          : Number.POSITIVE_INFINITY;
      const bScore =
        b?.playCount && b?.lowestScore
          ? b.lowestScore.score
          : Number.POSITIVE_INFINITY;
      return aScore - bScore;
    }
    default:
      return 0;
  }
};

const PlayerList = props => {
  const classes = useStyles();
  const d = useDispatch();
  const [playerNameText, setPlayerNameText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statisticsType, setStatisticsType] = useState("playCount");
  const [isOpenPlayerStatistics, setIsOpenPlayerStatistics] = useState(false);
  const [isOpenPlayerStatisticsId, setIsOpenPlayerStatisticsId] = useState("");
  const timer = useRef(null);

  const open = useSelector(state =>
    store.getAppState(state, "isOpenPlayerList")
  );
  const filteredUserIds = useSelector(state =>
    store.getFiltterdUserIds(state, { searchText })
  );
  const allStatistics = useSelector(state =>
    store.getAllUserStatsSummary(state)
  );
  const sortedUserIds = useMemo(() => {
    const candidates = [...filteredUserIds];
    return candidates.sort((a, b) => {
      const statsA = allStatistics[a]?.modes?.[DEFAULT_MODE] || null;
      const statsB = allStatistics[b]?.modes?.[DEFAULT_MODE] || null;
      return compareStatistics(statsA, statsB, statisticsType);
    });
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
  const onDeselect = useCallback(allClose => {
    setIsOpenPlayerStatistics(false);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    filteredUserIds.forEach(uid => {
      d(
        store.fetchUserStatsSummaryById(uid, {
          modes: [DEFAULT_MODE]
        })
      );
    });
  }, [open, filteredUserIds, d]);

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
              mode={DEFAULT_MODE}
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
            value="playCount"
            icon={<PlaysIcon />}
          />
          <BottomNavigationAction
            label="レーティング"
            value="rating"
            icon={<RatingIcon />}
          />
          <BottomNavigationAction
            label="平均点"
            value="averageScore"
            icon={<ScoreAveIcon />}
          />
          <BottomNavigationAction
            label="最高点"
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
