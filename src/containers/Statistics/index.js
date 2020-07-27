import React, { memo, useCallback, forwardRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@material-ui/core/styles";
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
} from "@material-ui/core";
import ArrowBackIcon from "@material-ui/icons/ArrowBackIos";

import { Orders } from "Constants";

import { forEach, size } from "lodash";
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
  const { payload, label } = o;
  const total = payload.reduce((result, entry) => result + entry.value, 0);

  return (
    <Card>
      <List>
        <ListSubheader>{label}</ListSubheader>
        {payload.map((entry, index) => (
          <ListItem key={`item-${index}`} style={{ padding: "0px 16px" }}>
            <Typography variant="caption" noWrap style={{ color: entry.color }}>
              {entry.name} - {getPercent(entry.value, total)}
            </Typography>
          </ListItem>
        ))}
      </List>
    </Card>
  );
};

const Statistics = props => {
  const classes = useStyles();
  const d = useDispatch();
  const open = useSelector(state =>
    store.getAppState(state, "isOpenStatistics")
  );
  const results = useSelector(state => store.getResults(state));
  const GetRank = (results, mySocre) => {
    let myRank = 1;
    results.forEach(result => {
      if (result.score.total > mySocre) {
        ++myRank;
      }
    });
    return myRank;
  };

  const orderData = useMemo(() => {
    let data = [
      { label: Orders[0], 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      { label: Orders[1], 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      { label: Orders[2], 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      { label: Orders[3], 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      { label: Orders[4], 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    ];
    forEach(results, result => {
      const sortedResult = result.results.sort((a, b) => a.order - b.order);
      sortedResult.forEach((result, order) => {
        data[order][GetRank(sortedResult, result.score.total)]++;
      });
    });
    return data;
  }, [results]);

  const onClose = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenStatistics = false;
      })
    );
  }, [d]);

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
            {size(results)} 戦
          </Typography>
        </ListItem>
        <ListItem>
          <ListItemText primary={<Typography noWrap>手番別順位</Typography>} />
        </ListItem>
        <ListItem divider>
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
            <YAxis tickFormatter={toPercent} />
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
        </ListItem>
      </List>
    </Dialog>
  );
};

export default memo(Statistics);
