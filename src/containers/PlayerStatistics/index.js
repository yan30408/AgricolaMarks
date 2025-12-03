import React, {
  memo,
  useCallback,
  forwardRef,
  useMemo,
  useState,
  useEffect,
  useRef
} from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@mui/styles";
import {
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Toolbar,
  Dialog,
  DialogContent,
  AppBar,
  Typography,
  Slide,
  Paper,
  TextField,
  MenuItem,
  Button
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackIos";
import MergeIcon from "@mui/icons-material/PeopleAlt";
import ChevronRightIcon from "@mui/icons-material/ArrowForwardIos";
import {
  BarChart,
  Bar,
  Tooltip,
  LabelList,
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { format } from "date-fns";

import { Colors, Orders, GameModes, DEFAULT_GAME_MODE } from "Constants";
import AlertDialog from "components/AlertDialog";
import PlayerResultHistoryDialog from "./PlayerResultHistoryDialog";
import {
  getAdjustedRating,
  formatAdjustedRating
} from "containers/PlayerList/ratingUtils";

const DEFAULT_MAIN_COLOR = "#607d8b";
const DEFAULT_SUB_COLOR = "#eceff1";
const RANK_LABELS = ["1位", "2位", "3位", "4位", "5位"];

const Transition = forwardRef((props, ref) => {
  return <Slide direction="left" ref={ref} {...props} />;
});

const useStyles = makeStyles(() => ({
  appBar: {
    position: "relative"
  },
  flex: {
    flex: 1
  },
  spacer: {
    flexGrow: 1
  },
  emptyState: {
    padding: "8px 0",
    color: "rgba(0, 0, 0, 0.54)"
  },
  chartFocusReset: {
    "& .recharts-surface:focus": {
      outline: "none"
    },
    "& .recharts-surface:focus-visible": {
      outline: "none"
    }
  }
}));

const EMPTY_STATS = {
  playCount: 0,
  winCount: 0,
  scoreTotal: 0,
  rankHistogram: {},
  orderHistogram: {},
  recentResults: [],
  favoriteColor: null,
  highestScore: null,
  lowestScore: null,
  rating: null
};

const toDateValue = value => {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    return value.toDate();
  }
  if (typeof value.toMillis === "function") {
    return new Date(value.toMillis());
  }
  if (value?.seconds !== undefined) {
    return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6);
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatPlayedAt = value => {
  const date = toDateValue(value);
  return date ? format(date, "yyyy/MM/dd - HH:mm") : null;
};

const toMillis = value => {
  const date = toDateValue(value);
  return date ? date.getTime() : 0;
};

const renderTooltipContent = ({ payload }) => {
  return (
    <Paper style={{ padding: "5px 10px" }}>
      <Typography variant="caption" noWrap>
        {payload?.length > 0
          ? formatPlayedAt(payload[0].payload.playedAt)
          : null}
      </Typography>
    </Paper>
  );
};

const PlayerStatistics = props => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { open, uid, mode: requestedMode, onChangeMode: onModeChange } = props;
  const [currentMode, setCurrentMode] = useState(
    requestedMode || DEFAULT_GAME_MODE
  );
  const [isOpenHistory, setIsOpenHistory] = useState(false);

  const user = useSelector(state => store.getUserById(state, uid));
  const createdByTwitterId = useSelector(state => {
    if (!user?.createdBy) return null;
    return store.getUserById(state, user.createdBy);
  })?.twitterId;
  const createdBy = createdByTwitterId
    ? `registered by ${createdByTwitterId}`
    : null;

  const rawStats = useSelector(state => store.getUserStatsById(state, uid));
  const statistics = useMemo(() => {
    if (!rawStats) {
      return EMPTY_STATS;
    }
    if (rawStats.modes && rawStats.modes[currentMode]) {
      return rawStats.modes[currentMode];
    }
    if (!rawStats.mode || rawStats.mode === currentMode) {
      return rawStats;
    }
    return EMPTY_STATS;
  }, [rawStats, currentMode]);
  const summary = useSelector(state =>
    store.getUserStatsSummaryById(state, uid)
  );

  const myUid = useSelector(state => store.getAppState(state, "uid"));
  const isAnonymous = useSelector(state =>
    store.getAppState(state, "isAnonymous")
  );
  // ユーザー主導でマージさせるのはいろいろ問題があるのでいったん封印
  // const canMerge = !isAnonymous && uid && uid !== myUid;
  const canMerge = false;

  const [openMerge, setOpenMerge] = useState(false);
  const statsSubscriptionsRef = useRef(new Map());
  const summarySubscriptionsRef = useRef(new Map());
  const isPlayerListOpen = useSelector(state =>
    Boolean(store.getAppState(state, "isOpenPlayerList"))
  );

  const cleanupSubscriptions = useCallback(() => {
    statsSubscriptionsRef.current.forEach(modeMap => {
      modeMap.forEach(unsubscribe => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
    });
    statsSubscriptionsRef.current.clear();
    summarySubscriptionsRef.current.forEach(unsubscribe => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    });
    summarySubscriptionsRef.current.clear();
  }, []);

  const releaseSummarySubscription = useCallback(targetUid => {
    if (!targetUid) return;
    const existing = summarySubscriptionsRef.current.get(targetUid);
    if (typeof existing === "function") {
      existing();
    }
    summarySubscriptionsRef.current.delete(targetUid);
  }, []);

  const ensureSummarySubscription = useCallback(
    targetUid => {
      if (!targetUid) return;
      if (summarySubscriptionsRef.current.has(targetUid)) return;
      const unsubscribe = dispatch(
        store.subscribeUserStatsSummaryById(targetUid)
      );
      if (typeof unsubscribe === "function") {
        summarySubscriptionsRef.current.set(targetUid, unsubscribe);
      }
    },
    [dispatch]
  );

  const ensureStatsSubscription = useCallback(
    (targetUid, modeKey) => {
      if (!targetUid || !modeKey) return;
      let modeMap = statsSubscriptionsRef.current.get(targetUid);
      if (!modeMap) {
        modeMap = new Map();
        statsSubscriptionsRef.current.set(targetUid, modeMap);
      }
      if (modeMap.has(modeKey)) return;
      const unsubscribe = dispatch(
        store.subscribeUserStatsById(targetUid, {
          gameMode: modeKey
        })
      );
      if (typeof unsubscribe === "function") {
        modeMap.set(modeKey, unsubscribe);
      }
    },
    [dispatch]
  );

  const modeSummary = summary?.modes?.[currentMode] || null;
  const favoriteColor = summary?.favoriteColor || null;
  const accentColor = Colors[favoriteColor]?.main || DEFAULT_MAIN_COLOR;
  const backgroundColor = Colors[favoriteColor]?.sub || DEFAULT_SUB_COLOR;

  useEffect(() => {
    setCurrentMode(requestedMode || DEFAULT_GAME_MODE);
  }, [requestedMode, uid]);

  const handleModeChange = useCallback(
    event => {
      const value = event.target.value;
      setCurrentMode(value);
      if (typeof onModeChange === "function") {
        onModeChange(value);
      }
    },
    [onModeChange]
  );

  useEffect(() => {
    if (!open || !uid) {
      return;
    }
    if (isPlayerListOpen) {
      releaseSummarySubscription(uid);
    } else {
      ensureSummarySubscription(uid);
    }
    const modeKey = currentMode || DEFAULT_GAME_MODE;
    ensureStatsSubscription(uid, modeKey);
  }, [
    open,
    uid,
    currentMode,
    isPlayerListOpen,
    ensureSummarySubscription,
    ensureStatsSubscription,
    releaseSummarySubscription
  ]);

  useEffect(() => {
    return () => {
      cleanupSubscriptions();
    };
  }, [cleanupSubscriptions]);

  const rankData = useMemo(() => {
    const histogram = statistics.rankHistogram || {};
    return RANK_LABELS.map((label, index) => {
      const key = String(index + 1);
      return {
        label,
        value: histogram[key] || 0
      };
    });
  }, [statistics.rankHistogram]);

  const orderData = useMemo(() => {
    const histogram = statistics.orderHistogram || {};
    return Orders.map((label, index) => {
      const key = String(index);
      const bucket = histogram[key] || { plays: 0, wins: 0 };
      const winRatio =
        bucket.plays > 0 ? (bucket.wins / bucket.plays) * 100 : 0;
      return {
        label,
        value: bucket.plays,
        winRatio: Number(winRatio.toFixed(1))
      };
    });
  }, [statistics.orderHistogram]);

  const recentData = useMemo(() => {
    const recent = statistics.recentResults || [];
    if (!recent.length) {
      return [];
    }
    return [...recent]
      .sort(
        (a, b) =>
          toMillis(b.playedAt || b.date) - toMillis(a.playedAt || a.date)
      )
      .slice(0, 5)
      .map(entry => ({
        id: entry.resultId,
        label:
          RANK_LABELS[(entry.rank || 1) - 1] ||
          RANK_LABELS[RANK_LABELS.length - 1],
        rank: entry.rank || RANK_LABELS.length,
        playedAt: entry.playedAt || entry.date || null
      }))
      .reverse();
  }, [statistics.recentResults]);

  const playCount = statistics.playCount || 0;
  const averageScore =
    playCount > 0 ? (statistics.scoreTotal / playCount).toFixed(1) : null;
  const highestScore = statistics.highestScore;
  const lowestScore = statistics.lowestScore;
  const ratingSource = useMemo(() => {
    if (
      modeSummary &&
      typeof modeSummary.rating === "number" &&
      Number.isFinite(modeSummary.rating)
    ) {
      return {
        rating: modeSummary.rating,
        lastPlayedAt: modeSummary.lastPlayedAt || null
      };
    }
    if (
      statistics &&
      typeof statistics.rating === "number" &&
      Number.isFinite(statistics.rating)
    ) {
      return {
        rating: statistics.rating,
        lastPlayedAt: statistics.lastPlayedAt || null
      };
    }
    return null;
  }, [modeSummary, statistics]);

  const adjustedRating = formatAdjustedRating(
    ratingSource ? getAdjustedRating(ratingSource) : null
  );

  const onClickMerge = useCallback(() => {
    setOpenMerge(true);
  }, []);

  const onMergeCancel = useCallback(() => {
    setOpenMerge(false);
  }, []);

  const onMergeOK = useCallback(async () => {
    setOpenMerge(false);
    try {
      await dispatch(store.mergeUserAccounts(uid, myUid));
      await dispatch(
        store.fetchUserStatsById(myUid, { gameMode: DEFAULT_GAME_MODE })
      );
      await dispatch(
        store.fetchUserStatsSummaryById(myUid, { modes: [DEFAULT_GAME_MODE] })
      );
      props.onClose(true);
    } catch (error) {
      console.error("Failed to merge user accounts", error);
    }
  }, [dispatch, uid, myUid, props.onClose]);

  const onOpenHistory = useCallback(() => {
    setIsOpenHistory(true);
  }, []);

  const onCloseHistory = useCallback(() => {
    setIsOpenHistory(false);
  }, []);

  if (!user) {
    return null;
  }

  return (
    <>
      <Dialog
        fullScreen
        open={open}
        onClose={props.onClose}
        TransitionComponent={Transition}
        disableRestoreFocus
      >
        <AppBar className={classes.appBar}>
          <Toolbar>
            <IconButton
              color="inherit"
              onClick={props.onClose}
              aria-label="Close"
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" color="inherit" className={classes.flex}>
              Player Statistics
            </Typography>
          </Toolbar>
        </AppBar>
        <DialogContent style={{ backgroundColor }}>
          <List>
            <ListItem divider>
              <TextField
                select
                label="ゲームモード"
                variant="outlined"
                value={currentMode}
                onChange={handleModeChange}
                InputLabelProps={{
                  shrink: true
                }}
                fullWidth
              >
                {Object.entries(GameModes).map(([modeKey, meta]) => (
                  <MenuItem key={modeKey} value={modeKey}>
                    {meta.label}
                  </MenuItem>
                ))}
              </TextField>
            </ListItem>
            <ListItem divider>
              <ListItemAvatar>
                <Avatar
                  src={user.photoUrl}
                  alt={user.displayName}
                  style={{ backgroundColor: accentColor }}
                >
                  {user.displayName?.substr(0, 1)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={<Typography noWrap>{user.displayName}</Typography>}
                secondary={user.twitterId || createdBy || "Anonymous"}
              />
              {canMerge ? (
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={onClickMerge}>
                    <MergeIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              ) : null}
            </ListItem>
            <ListItem divider>
              <ListItemText primary="プレイ回数" />
              <div className={classes.spacer} />
              <Typography variant="subtitle2" noWrap>
                {playCount} 回
              </Typography>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="レート" />
              <div className={classes.spacer} />
              <Typography variant="subtitle2" noWrap>
                {adjustedRating || "-"}
              </Typography>
            </ListItem>
            <ListItem>
              <ListItemText
                primary={<Typography noWrap>順位分布</Typography>}
              />
            </ListItem>
            <ListItem divider>
              <BarChart
                width={300}
                height={250}
                data={rankData}
                margin={{ top: 20, right: 5, left: 5, bottom: 5 }}
                className={classes.chartFocusReset}
              >
                <CartesianGrid strokeDasharray="3" stroke={accentColor} />
                <XAxis dataKey="label" />
                <YAxis unit="回" allowDecimals={false} />
                <Bar dataKey="value" fill="#413ea0">
                  <LabelList dataKey="value" position="top" unit="回" />
                </Bar>
              </BarChart>
            </ListItem>
            <ListItem>
              <ListItemText
                primary={<Typography noWrap>直近の戦績</Typography>}
              />
            </ListItem>
            <ListItem divider>
              {recentData.length > 0 ? (
                <div style={{ width: "100%" }}>
                  <LineChart
                    width={300}
                    height={150}
                    data={recentData}
                    margin={{ top: 10, right: 5, left: 5, bottom: 5 }}
                    className={classes.chartFocusReset}
                  >
                    <Tooltip content={renderTooltipContent} />
                    <CartesianGrid
                      strokeDasharray="3"
                      stroke={accentColor}
                      vertical={false}
                    />
                    <YAxis
                      type="number"
                      domain={[1, RANK_LABELS.length]}
                      ticks={Array.from(
                        { length: RANK_LABELS.length },
                        (_, index) => index + 1
                      )}
                      tickFormatter={value => `${value}位`}
                      allowDecimals={false}
                      reversed
                    />
                    <Line dataKey="rank" stroke="#413ea0" />
                  </LineChart>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      onClick={onOpenHistory}
                      endIcon={<ChevronRightIcon />}
                    >
                      過去の戦績一覧を表示
                    </Button>
                  </div>
                </div>
              ) : (
                <Typography variant="body2" className={classes.emptyState}>
                  データがありません
                </Typography>
              )}
            </ListItem>
            <ListItem divider>
              <ListItemText
                primary={<Typography noWrap>最高得点</Typography>}
                secondary={
                  highestScore ? formatPlayedAt(highestScore.playedAt) : "-"
                }
              />
              <div className={classes.spacer} />
              <Typography variant="subtitle2" noWrap>
                {highestScore ? `${highestScore.score} 点` : "-"}
              </Typography>
            </ListItem>
            <ListItem divider>
              <ListItemText
                primary={<Typography noWrap>最低得点</Typography>}
                secondary={
                  lowestScore ? formatPlayedAt(lowestScore.playedAt) : "-"
                }
              />
              <div className={classes.spacer} />
              <Typography variant="subtitle2" noWrap>
                {lowestScore ? `${lowestScore.score} 点` : "-"}
              </Typography>
            </ListItem>
            <ListItem divider>
              <ListItemText primary={<Typography noWrap>平均点</Typography>} />
              <div className={classes.spacer} />
              {averageScore === null ? (
                <Typography variant="subtitle2" noWrap>
                  プレイ数が足りません
                </Typography>
              ) : (
                <Typography variant="subtitle2" noWrap>
                  {averageScore} 点
                </Typography>
              )}
            </ListItem>
            <ListItem>
              <ListItemText
                primary={<Typography noWrap>手番分布</Typography>}
              />
            </ListItem>
            <ListItem divider>
              <ComposedChart
                width={300}
                height={250}
                data={orderData}
                margin={{ top: 20, right: 5, left: 5, bottom: 5 }}
                className={classes.chartFocusReset}
              >
                <CartesianGrid strokeDasharray="3" stroke={accentColor} />
                <XAxis dataKey="label" />
                <YAxis
                  type="number"
                  yAxisId="1"
                  unit="回"
                  allowDecimals={false}
                />
                <YAxis
                  orientation="right"
                  domain={[0, 100]}
                  type="number"
                  yAxisId="2"
                  unit="%"
                />
                <Tooltip />
                <Bar
                  yAxisId="1"
                  name="回数"
                  dataKey="value"
                  fill="#413ea0"
                  barSize={20}
                  unit="回"
                >
                  <LabelList dataKey="value" position="top" />
                </Bar>
                <Line
                  yAxisId="2"
                  name="1位率"
                  type="monotone"
                  dataKey="winRatio"
                  stroke="#ff7300"
                  unit="%"
                />
              </ComposedChart>
            </ListItem>
            <ListItem divider>
              <ListItemText
                primary={<Typography noWrap>よく使う色</Typography>}
              />
              <div className={classes.spacer} />
              <Typography
                variant="subtitle2"
                noWrap
                style={{ color: accentColor }}
              >
                {favoriteColor || "-"}
              </Typography>
            </ListItem>
          </List>
        </DialogContent>
        <AlertDialog
          title="ユーザーを統合します"
          isOpen={openMerge}
          onClose={onMergeCancel}
          onClickOk={onMergeOK}
        >
          このユーザーを現在のアカウントと統合します。
          <br />
          本当によろしいですか？
        </AlertDialog>
      </Dialog>
      <PlayerResultHistoryDialog
        open={isOpenHistory}
        uid={uid}
        mode={currentMode}
        onClose={onCloseHistory}
      />
    </>
  );
};

export default memo(PlayerStatistics);
