import React, { memo, useCallback, forwardRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@material-ui/core/styles";
import {
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Toolbar,
  Dialog,
  DialogContent,
  AppBar,
  Typography,
  Slide
} from "@material-ui/core";
import ArrowBackIcon from "@material-ui/icons/ArrowBackIos";

import { Colors, Orders } from "Constants";

import { format } from "date-fns";
import {
  BarChart,
  Bar,
  Tooltip,
  Legend,
  Label,
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

const PlayerStatics = props => {
  const classes = useStyles();
  const d = useDispatch();
  const open = useSelector(state =>
    store.getAppState(state, "isOpenPlayerStatics")
  );
  const uid = useSelector(state =>
    store.getAppState(state, "openPlayerStaticsId")
  );
  const user = useSelector(state => store.getUserById(state, uid));
  const createdByTwitterId = useSelector(state =>
    store.getUserById(state, user.createdBy)
  )?.twitterId;
  const createdBy = createdByTwitterId ? `made by ${createdByTwitterId}` : null;
  const statics = useSelector(state =>
    store.getUserStaticsById(state, { uid: uid })
  );

  const rankLabel = ["1位", "2位", "3位", "4位", "5位"];
  const rankData = useMemo(() => {
    return rankLabel.map((label, index) => {
      return {
        label,
        value: statics.record.filter(value => value.rank === index + 1).length
      };
    });
  }, [statics]);
  const orderData = useMemo(() => {
    return Orders.map((label, index) => {
      const target = statics.record.filter(value => value.order === index);
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
  }, [statics]);
  const recentData = useMemo(() => {
    return statics.record
      .sort((a, b) => b.date - a.date)
      .slice(0, 5)
      .map(value => {
        return {
          label: rankLabel[value.rank - 1],
          rank: value.rank
        };
      });
  }, [statics]);

  const onClose = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenPlayerStatics = false;
      })
    );
  }, [d]);

  const getDate = date => {
    if (!date) return null;
    return format(
      new Date(date.seconds * 1000 + date.nanoseconds / 1000000),
      "yyyy.MM.dd - HH:mm:ss"
    );
  };

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
    >
      <AppBar className={classes.appBar}>
        <Toolbar>
          <IconButton color="inherit" onClick={onClose} aria-label="Close">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" color="inherit" className={classes.flex}>
            Player Statics
          </Typography>
        </Toolbar>
      </AppBar>
      <DialogContent
        style={{ backgroundColor: Colors[statics.favoriteColor]?.sub }}
      >
        <List>
          <ListItem divider>
            <ListItemAvatar>
              <Avatar src={user.photoUrl} />
            </ListItemAvatar>
            <ListItemText
              primary={<Typography noWrap>{user.displayName}</Typography>}
              secondary={user.twitterId || createdBy || "Anonymous"}
            />
          </ListItem>
          <ListItem divider>
            <ListItemText
              primary={<Typography noWrap>プレイ回数</Typography>}
            />
            <div className={classes.spacer} />
            <Typography variant="subtitle2" noWrap>
              {statics.playNum} 回
            </Typography>
          </ListItem>
          <ListItem divider>
            <ListItemText primary={<Typography noWrap>1位率</Typography>} />
            <div className={classes.spacer} />
            <Typography variant="subtitle2" noWrap>
              {statics.winRate} ％
            </Typography>
          </ListItem>
          <ListItem>
            <ListItemText primary={<Typography noWrap>順位分布</Typography>} />
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
                stroke={Colors[statics.favoriteColor]?.main}
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
              <CartesianGrid
                strokeDasharray="3"
                stroke={Colors[statics.favoriteColor]?.main}
                vertical={false}
              />

              <YAxis type="number" domain={[1, 5]} unit="位" reversed />
              <Line dataKey="rank" stroke="#413ea0" />
            </LineChart>
          </ListItem>
          <ListItem divider>
            <ListItemText
              primary={<Typography noWrap>最高得点</Typography>}
              secondary={getDate(statics.highestScore.date)}
            />
            <div className={classes.spacer} />
            <Typography variant="subtitle2" noWrap>
              {statics.highestScore.score} 点
            </Typography>
          </ListItem>
          <ListItem divider>
            <ListItemText
              primary={<Typography noWrap>最低得点</Typography>}
              secondary={getDate(statics.lowestScore.date)}
            />
            <div className={classes.spacer} />
            <Typography variant="subtitle2" noWrap>
              {statics.lowestScore.score} 点
            </Typography>
          </ListItem>
          <ListItem divider>
            <ListItemText primary={<Typography noWrap>平均点</Typography>} />
            <div className={classes.spacer} />
            <Typography variant="subtitle2" noWrap>
              {statics.averageScore} 点
            </Typography>
          </ListItem>
          <ListItem>
            <ListItemText primary={<Typography noWrap>手番分布</Typography>} />
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
                stroke={Colors[statics.favoriteColor]?.main}
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
              style={{ color: Colors[statics.favoriteColor]?.main }}
            >
              {statics.favoriteColor}
            </Typography>
          </ListItem>
        </List>
      </DialogContent>
    </Dialog>
  );
};

export default memo(PlayerStatics);
