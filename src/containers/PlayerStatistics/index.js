import React, { memo, useCallback, forwardRef, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@material-ui/core/styles";
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
} from "@material-ui/core";
import ArrowBackIcon from "@material-ui/icons/ArrowBackIos";
import MergeIcon from "@material-ui/icons/PeopleAlt";

import { Colors, Orders } from "Constants";
import AlertDialog from "components/AlertDialog";
import ResultRecord from "containers/ResultList/ResultRecord";

import { format } from "date-fns";
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

const Transition = forwardRef((props, ref) => {
  return <Slide direction="left" ref={ref} {...props} />;
});

const useStyles = makeStyles(theme => ({
  appBar: {
    position: "relative"
  },
  flex: {
    flex: 1
  },
  spacer: {
    flexGrow: 1
  }
}));

const getDate = date => {
  if (!date) return null;
  return format(
    new Date(date.seconds * 1000 + date.nanoseconds / 1000000),
    "yyyy/MM/dd - HH:mm"
  );
};

const renderTooltipContent = o => {
  const { payload, label } = o;

  return (
    <Paper style={{ padding: "5px 10px" }}>
      <Typography variant="caption" noWrap>
        {payload.length > 0 ? getDate(payload[0].payload.date) : null}
      </Typography>
    </Paper>
  );
};

const PlayerStatistics = props => {
  const classes = useStyles();
  const d = useDispatch();
  const { open, uid } = props;
  const user = useSelector(state => store.getUserById(state, uid));
  const createdByTwitterId = useSelector(state =>
    store.getUserById(state, user.createdBy)
  )?.twitterId;
  const createdBy = createdByTwitterId
    ? `registered by ${createdByTwitterId}`
    : null;
  const statistics = useSelector(state =>
    store.getUserStatisticsById(state, { uid: uid })
  );
  const myUid = useSelector(state => store.getAppState(state, "uid"));
  const isAnonymous = useSelector(state =>
    store.getAppState(state, "isAnonymous")
  );
  const [isOpenResult, setIsOpenResult] = useState(false);
  const [isOpenResultId, setIsOpenResultId] = useState("");

  const rankLabel = ["1位", "2位", "3位", "4位", "5位"];
  const rankData = useMemo(() => {
    return rankLabel.map((label, index) => {
      return {
        label,
        value: statistics.record.filter(value => value.rank === index + 1)
          .length
      };
    });
  }, [statistics]);
  const orderData = useMemo(() => {
    return Orders.map((label, index) => {
      const target = statistics.record.filter(value => value.order === index);
      const winRatio =
        target.length > 0
          ? target.filter(value => value.rank === 1).length / target.length
          : 0;
      return {
        label,
        value: target.length,
        winRatio: (winRatio * 100).toFixed(1)
      };
    });
  }, [statistics]);
  const recentData = useMemo(() => {
    return statistics.record
      .sort((a, b) => b.date - a.date)
      .slice(0, 5)
      .map(value => {
        return {
          id: value.id,
          label: rankLabel[value.rank - 1],
          rank: value.rank,
          date: value.date
        };
      })
      .reverse();
  }, [statistics]);

  const [openMerge, setOpenMerge] = useState(false);
  const onClickMerge = useCallback(() => {
    setOpenMerge(true);
  }, []);
  const onMergeCancel = useCallback(() => {
    setOpenMerge(false);
  }, []);
  const onMergeOK = useCallback(() => {
    setOpenMerge(false);
    d(store.updateUser(uid, { merged: myUid }));
    d(
      store.appStateMutate(state => {
        state.openPlayerStatisticsId = myUid;
      })
    );
  }, [uid, myUid]);

  const onSelect = useCallback(o => {
    const { payload } = o;
    if (payload) {
      setIsOpenResult(true);
      setIsOpenResultId(payload.id);
    }
  }, []);
  const onDeselect = useCallback(id => {
    setIsOpenResult(false);
  }, []);

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
        <DialogContent
          style={{ backgroundColor: Colors[statistics.favoriteColor]?.sub }}
        >
          <List>
            <ListItem divider>
              <ListItemAvatar>
                <Avatar
                  src={user.photoUrl}
                  alt={user.displayName}
                  style={{
                    backgroundColor: Colors[statistics.favoriteColor]?.main
                  }}
                >
                  {user.displayName?.substr(0, 1)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={<Typography noWrap>{user.displayName}</Typography>}
                secondary={user.twitterId || createdBy || "Anonymous"}
              />
              {createdBy && !isAnonymous ? (
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
                {statistics.playNum} 回
              </Typography>
            </ListItem>
            <ListItem divider>
              <ListItemText primary={<Typography noWrap>勝率</Typography>} />
              <div className={classes.spacer} />
              {statistics.winRate === -1 ? (
                <Typography variant="subtitle2" noWrap>
                  プレイ数が足りません
                </Typography>
              ) : (
                <Typography variant="subtitle2" noWrap>
                  {statistics.winRate} ％
                </Typography>
              )}
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
                <CartesianGrid
                  strokeDasharray="3"
                  stroke={Colors[statistics.favoriteColor]?.main}
                />
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
              <LineChart
                width={300}
                height={150}
                data={recentData}
                margin={{ top: 10, right: 5, left: 5, bottom: 5 }}
              >
                <Tooltip content={renderTooltipContent} />
                <CartesianGrid
                  strokeDasharray="3"
                  stroke={Colors[statistics.favoriteColor]?.main}
                  vertical={false}
                />

                <YAxis type="number" domain={[1, 5]} unit="位" reversed />
                <Line
                  dataKey="rank"
                  stroke="#413ea0"
                  activeDot={{
                    onClick: onSelect
                  }}
                />
              </LineChart>
            </ListItem>
            <ListItem divider>
              <ListItemText
                primary={<Typography noWrap>最高得点</Typography>}
                secondary={getDate(statistics.highestScore.date)}
              />
              <div className={classes.spacer} />
              <Typography variant="subtitle2" noWrap>
                {statistics.highestScore.score} 点
              </Typography>
            </ListItem>
            <ListItem divider>
              <ListItemText
                primary={<Typography noWrap>最低得点</Typography>}
                secondary={getDate(statistics.lowestScore.date)}
              />
              <div className={classes.spacer} />
              <Typography variant="subtitle2" noWrap>
                {statistics.lowestScore.score} 点
              </Typography>
            </ListItem>
            <ListItem divider>
              <ListItemText primary={<Typography noWrap>平均点</Typography>} />
              <div className={classes.spacer} />
              {statistics.averageScore === -1 ? (
                <Typography variant="subtitle2" noWrap>
                  プレイ数が足りません
                </Typography>
              ) : (
                <Typography variant="subtitle2" noWrap>
                  {statistics.averageScore} 点
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
                <CartesianGrid
                  strokeDasharray="3"
                  stroke={Colors[statistics.favoriteColor]?.main}
                />
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
                style={{ color: Colors[statistics.favoriteColor]?.main }}
              >
                {statistics.favoriteColor}
              </Typography>
            </ListItem>
          </List>
        </DialogContent>
        <AlertDialog
          title={"ユーザーを統合します"}
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
