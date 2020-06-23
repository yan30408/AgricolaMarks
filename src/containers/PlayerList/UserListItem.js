import React, { memo, useCallback, useRef, useState } from "react";
import { useSelector } from "react-redux";
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
import CheckIcon from "@material-ui/icons/Check";

const useStyles = makeStyles({
  spacer: {
    flexGrow: 1
  },
  checkMark: {
    minWidth: 0
  }
});

const UserListItem = props => {
  const classes = useStyles();
  const anchorEl = useRef(null);

  const user = useSelector(state => store.getUserById(state, props.uid));
  const createdByTwitterId = useSelector(state =>
    store.getUserById(state, user.createdBy)
  )?.twitterId;
  const createdBy = createdByTwitterId ? `made by ${createdByTwitterId}` : null;

  const onSelect = useCallback(() => {}, []);
  if (!user.displayName) return null;

  return (
    <>
      <ListItem button onClick={onSelect} divider>
        <ListItemAvatar>
          <Avatar src={user.photoUrl} />
        </ListItemAvatar>
        <ListItemText
          primary={<Typography noWrap>{user.displayName}</Typography>}
          secondary={user.twitterId || createdBy || "Anonymous"}
        />
        <div className={classes.spacer} />
      </ListItem>
    </>
  );
};

export default memo(UserListItem);
