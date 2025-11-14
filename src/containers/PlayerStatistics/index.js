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
  Paper
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackIos";
import MergeIcon from "@mui/icons-material/PeopleAlt";
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

import { Colors, Orders, DEFAULT_GAME_MODE } from "Constants";
import AlertDialog from "components/AlertDialog";
import ResultRecord from "containers/ResultList/ResultRecord";

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

const getDate = date => {
  if (!date) return null;
  return format(
    new Date(date.seconds * 1000 + date.nanoseconds / 1000000),
    "yyyy/MM/dd - HH:mm"
  );
};

const toMillis = date => {
  if (!date) return 0;
  if (typeof date.toMillis === "function") {
    return date.toMillis();
  }
  if (date.seconds !== undefined) {
    return date.seconds * 1000 + (date.nanoseconds || 0) / 1e6;
  }
  return Number(date) || 0;
};

const renderTooltipContent = ({ payload }) => {
  return (
    <Paper style={{ padding: "5px 10px" }}>
      <Typography variant="caption" noWrap>
        {payload?.length > 0 ? getDate(payload[0].payload.date) : null}
      </Typography>
    </Paper>
  );
};

const PlayerStatistics = props => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { open, uid } = props;

  const user = useSelector(state => store.getUserById(state, uid));
  const createdByTwitterId = useSelector(state => {
    if (!user?.createdBy) return null;
    return store.getUserById(state, user.createdBy);
  })?.twitterId;
  const createdBy = createdByTwitterId
    ? `registered by ${createdByTwitterId}`
    : null;

  const rawStats = useSelector(state => store.getUserStatsById(state, uid));
  const statistics = rawStats || EMPTY_STATS;

  const myUid = useSelector(state => store.getAppState(state, "uid"));
  const isAnonymous = useSelector(state =>
    store.getAppState(state, "isAnonymous")
  );
  const canMerge = !isAnonymous && uid && uid !== myUid;

  const [isOpenResult, setIsOpenResult] = useState(false);
  const [isOpenResultId, setIsOpenResultId] = useState("");
  const [openMerge, setOpenMerge] = useState(false);
  const statsRequestRef = useRef(false);

  const favoriteColor = statistics.favoriteColor;
  const accentColor = Colors[favoriteColor]?.main || DEFAULT_MAIN_COLOR;
  const backgroundColor = Colors[favoriteColor]?.sub || DEFAULT_SUB_COLOR;

  useEffect(() => {
    if (!open || !uid) return;
    if (statsRequestRef.current) {
      clearTimeout(statsRequestRef.current);
      statsRequestRef.current = null;
    }
    statsRequestRef.current = setTimeout(() => {
      dispatch(
        store.fetchUserStatsById(uid, {
          gameMode: DEFAULT_GAME_MODE
        })
      );
    }, 200);
    return () => {
      if (statsRequestRef.current) {
        clearTimeout(statsRequestRef.current);
        statsRequestRef.current = null;
      }
    };
  }, [open, uid, dispatch]);

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
      .sort((a, b) => toMillis(b.date) - toMillis(a.date))
      .slice(0, 5)
      .map(entry => ({
        id: entry.resultId,
        label:
          RANK_LABELS[(entry.rank || 1) - 1] ||
          RANK_LABELS[RANK_LABELS.length - 1],
        rank: entry.rank || RANK_LABELS.length,
        date: entry.date
      }))
      .reverse();
  }, [statistics.recentResults]);

  const playCount = statistics.playCount || 0;
  const averageScore =
    playCount > 0 ? (statistics.scoreTotal / playCount).toFixed(1) : null;
  const highestScore = statistics.highestScore;
  const lowestScore = statistics.lowestScore;
  const rating = statistics.rating;

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
      props.onClose(true);
    } catch (error) {
      console.error("Failed to merge user accounts", error);
    }
  }, [dispatch, uid, myUid, props.onClose]);

  const onSelect = useCallback(event => {
    const { payload } = event;
    if (payload) {
      setIsOpenResult(true);
      setIsOpenResultId(payload.id);
    }
  }, []);

  const onDeselect = useCallback(
    allClose => {
      if (allClose === true) props.onClose(true);
      setIsOpenResult(false);
    },
    [props.onClose]
  );

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
              <ListItemText
                primary={<Typography noWrap>プレイ回数</Typography>}
              />
              <div className={classes.spacer} />
              <Typography variant="subtitle2" noWrap>
                {playCount} 回
              </Typography>
            </ListItem>
            <ListItem divider>
              <ListItemText
                primary={<Typography noWrap>レーティング</Typography>}
              />
              <div className={classes.spacer} />
              <Typography variant="subtitle2" noWrap>
                {rating != null ? rating : "-"}
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
              >
                <CartesianGrid strokeDasharray="3" stroke={accentColor} />
                <XAxis dataKey="label" />
                <YAxis unit="回" allowDecimals={false} />
                <Tooltip />
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
                <LineChart
                  width={300}
                  height={150}
                  data={recentData}
                  margin={{ top: 10, right: 5, left: 5, bottom: 5 }}
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
                  <Line
                    dataKey="rank"
                    stroke="#413ea0"
                    activeDot={{
                      onClick: onSelect
                    }}
                  />
                </LineChart>
              ) : (
                <Typography variant="body2" className={classes.emptyState}>
                  データがありません
                </Typography>
              )}
            </ListItem>
            <ListItem divider>
              <ListItemText
                primary={<Typography noWrap>最高得点</Typography>}
                secondary={highestScore ? getDate(highestScore.date) : "-"}
              />
              <div className={classes.spacer} />
              <Typography variant="subtitle2" noWrap>
                {highestScore ? `${highestScore.score} 点` : "-"}
              </Typography>
            </ListItem>
            <ListItem divider>
              <ListItemText
                primary={<Typography noWrap>最低得点</Typography>}
                secondary={lowestScore ? getDate(lowestScore.date) : "-"}
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
      <ResultRecord
        open={isOpenResult}
        resultId={isOpenResultId}
        onClose={onDeselect}
      />
    </>
  );
};

export default memo(PlayerStatistics);
