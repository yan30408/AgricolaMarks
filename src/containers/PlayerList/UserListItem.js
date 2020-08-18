import React, { memo, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@material-ui/core/styles";
import {
  Avatar,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemIcon,
  Typography
} from "@material-ui/core";
import ArrowForwardIcon from "@material-ui/icons/ArrowForwardIos";

import { Colors } from "Constants";

const useStyles = makeStyles({
  spacer: {
    flexGrow: 1
  },
  arrowForward: {
    paddingLeft: "8px",
    minWidth: 0
  }
});

const UserListItem = props => {
  const classes = useStyles();
  const d = useDispatch();

  const user = useSelector(state => store.getUserById(state, props.uid));
  const createdByTwitterId = useSelector(state =>
    store.getUserById(state, user.createdBy)
  )?.twitterId;
  const createdBy = createdByTwitterId ? `made by ${createdByTwitterId}` : null;
  const statistics = useSelector(state =>
    store.getUserStatisticsById(state, { uid: props.uid })
  );
  const value = useMemo(() => {
    if (props.statisticsType.includes("Num")) {
      return `${statistics[props.statisticsType]} 回`;
    } else if (props.statisticsType.includes("average")) {
      return `${statistics[props.statisticsType]} pt`;
    } else if (props.statisticsType.includes("Score")) {
      return `${statistics[props.statisticsType].score} pt`;
    } else {
      return `${statistics[props.statisticsType]} %`;
    }
  }, [props.statisticsType, statistics]);

  const onSelect = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenPlayerStatistics = true;
        state.openPlayerStatisticsId = props.uid;
      })
    );
  }, [d]);
  if (!user.displayName) return null;

  return (
    <>
      <ListItem
        button
        onClick={onSelect}
        divider
        style={{ backgroundColor: Colors[statistics.favoriteColor]?.sub }}
      >
        <ListItemAvatar>
          <Avatar src={user.photoUrl} />
        </ListItemAvatar>
        <ListItemText
          primary={<Typography noWrap>{user.displayName}</Typography>}
          secondary={user.twitterId || createdBy || "Anonymous"}
        />
        <div className={classes.spacer} />
        <Typography variant="subtitle2" noWrap style={{ minWidth: "46px" }}>
          {value}
        </Typography>
        <ListItemIcon className={classes.arrowForward}>
          <ArrowForwardIcon />
        </ListItemIcon>
      </ListItem>
    </>
  );
};

export default memo(UserListItem);
