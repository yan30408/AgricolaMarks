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
  const statics = useSelector(state =>
    store.getUserStaticsById(state, { uid: props.uid })
  );
  const value = useMemo(() => {
    if (props.staticsType.includes("Num")) {
      return `${statics[props.staticsType]} 回`;
    } else if (props.staticsType.includes("average")) {
      return `${statics[props.staticsType]} pt`;
    } else if (props.staticsType.includes("Score")) {
      return `${statics[props.staticsType].score} pt`;
    } else {
      return `${statics[props.staticsType]} %`;
    }
  }, [props.staticsType, statics]);

  const onSelect = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenPlayerStatics = true;
        state.openPlayerStaticsId = props.uid;
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
        style={{ backgroundColor: Colors[statics.favoriteColor]?.sub }}
      >
        <ListItemAvatar>
          <Avatar src={user.photoUrl} />
        </ListItemAvatar>
        <ListItemText
          primary={<Typography noWrap>{user.displayName}</Typography>}
          secondary={user.twitterId || createdBy || "Anonymous"}
        />
        <div className={classes.spacer} />
        <Typography variant="subtitle2" noWrap>
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
