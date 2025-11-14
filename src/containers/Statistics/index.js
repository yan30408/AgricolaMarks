import React, {
  memo,
  useCallback,
  forwardRef,
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
  ListItemText,
  Toolbar,
  Dialog,
  AppBar,
  Typography,
  Slide,
  Card,
  ListSubheader
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackIos";

import { Orders } from "Constants";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip
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

const getPercent = (value, total) => {
  const ratio = total > 0 ? value / total : 0;
  return toPercent(ratio, 1);
};

const toPercent = (decimal, fixed = 0) => `${(decimal * 100).toFixed(fixed)}%`;

const renderTooltipContent = o => {
  const { payload = [], label } = o;
  const total = payload.reduce(
    (result, entry) => result + (entry.value || 0),
    0
  );

  return (
    <Card>
      <List>
        <ListSubheader>{label}</ListSubheader>
        {payload.map((entry, index) => (
          <ListItem key={`item-${index}`} style={{ padding: "0px 16px" }}>
            <Typography variant="caption" noWrap style={{ color: entry.color }}>
              {entry.name} - {getPercent(entry.value || 0, total)}
            </Typography>
          </ListItem>
        ))}
      </List>
    </Card>
  );
};

const Statistics = props => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const open = useSelector(state =>
    store.getAppState(state, "isOpenStatistics")
  );
  const summary = useSelector(state => store.getGlobalStatsSummary(state));

  useEffect(() => {
    if (open) {
      dispatch(store.fetchGlobalStats());
    }
  }, [open, dispatch]);

  const matchCount = summary?.matchCount || 0;

  const orderData = useMemo(() => {
    return Orders.map((label, index) => {
      const bucket = summary?.orderHistogram?.[String(index)] || {};
      const rankCounts = bucket.rankCounts || {};
      return {
        label,
        1: rankCounts["1"] || 0,
        2: rankCounts["2"] || 0,
        3: rankCounts["3"] || 0,
        4: rankCounts["4"] || 0,
        5: rankCounts["5"] || 0
      };
    });
  }, [summary]);

  const isEmpty = !summary || matchCount === 0;

  const onClose = useCallback(() => {
    dispatch(
      store.appStateMutate(state => {
        state.isOpenStatistics = false;
      })
    );
  }, [dispatch]);

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
            Statistics
          </Typography>
        </Toolbar>
      </AppBar>
      <List>
        <ListItem divider>
          <ListItemText primary={<Typography noWrap>データ総数</Typography>} />
          <div className={classes.spacer} />
          <Typography variant="subtitle2" noWrap>
            {matchCount} 戦
          </Typography>
        </ListItem>
        <ListItem>
          <ListItemText primary={<Typography noWrap>手番別順位</Typography>} />
        </ListItem>
        <ListItem divider>
          {isEmpty ? (
            <Typography variant="body2" color="textSecondary">
              データがありません
            </Typography>
          ) : (
            <AreaChart
              width={350}
              height={350}
              data={orderData}
              stackOffset="expand"
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0
              }}
            >
              <CartesianGrid strokeDasharray="5" />
              <XAxis dataKey="label" />
              <YAxis
                type="number"
                domain={[0, 1]}
                ticks={[0, 0.25, 0.5, 0.75, 1]}
                tickFormatter={value => `${Math.round(value * 100)}%`}
              />
              <Legend verticalAlign="top" align="right" iconType="square" />
              <Tooltip content={renderTooltipContent} />
              <Area
                dataKey="1"
                stackId="1"
                stroke="#182cc7"
                fill="#182cc7"
                name="1位"
              />
              <Area
                dataKey="2"
                stackId="1"
                stroke="#18c7aa"
                fill="#18c7aa"
                name="2位"
              />
              <Area
                dataKey="3"
                stackId="1"
                stroke="#52c718"
                fill="#52c718"
                name="3位"
              />
              <Area
                dataKey="4"
                stackId="1"
                stroke="#c7b818"
                fill="#c7b818"
                name="4位"
              />
              <Area
                dataKey="5"
                stackId="1"
                stroke="#c71818"
                fill="#c71818"
                name="5位"
              />
            </AreaChart>
          )}
        </ListItem>
      </List>
    </Dialog>
  );
};

export default memo(Statistics);
