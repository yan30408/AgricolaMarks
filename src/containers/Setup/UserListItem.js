import React, { memo, useCallback, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@material-ui/core/styles";
import {
  Avatar,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemIcon
} from "@material-ui/core";
import CheckIcon from "@material-ui/icons/Check";

import PlayerColorSelect from "./PlayerColorSelect";

const useStyles = makeStyles(theme => ({
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1)
  },
  margin: {
    margin: theme.spacing(1)
  },
  flex: {
    flex: 1
  }
}));

const UserListItem = props => {
  const classes = useStyles();
  const d = useDispatch();
  const [openColorSelect, setOpenColorSelect] = useState(false);
  const anchorEl = useRef(null);

  const user = useSelector(state => store.getUserById(state, props.uid));
  const color = useSelector(state =>
    store.getAppCurrentPlayerById(state, props.uid)
  )?.color.sub;
  const madeByTwitterId = useSelector(state =>
    store.getUserById(state, user.madeBy)
  )?.twitterId;
  const madeBy = madeByTwitterId ? `made by ${madeByTwitterId}` : null;

  const onSelect = useCallback(() => {
    setOpenColorSelect(true);
  }, [d]);
  const onCloseColorSelect = useCallback(() => {
    setOpenColorSelect(false);
  }, []);

  return (
    <>
      <ListItem
        button
        onClick={onSelect}
        style={{ backgroundColor: color }}
        divider
      >
        <ListItemAvatar>
          <Avatar src={user.photoUrl} />
        </ListItemAvatar>
        <ListItemText
          primary={user.displayName}
          secondary={user.twitterId || madeBy || "Anonymous"}
        />
        <div style={{ flexGrow: 1 }} />
        <ListItemIcon ref={anchorEl} style={{ minWidth: 0 }}>
          {color ? <CheckIcon /> : null}
        </ListItemIcon>
      </ListItem>
      <PlayerColorSelect
        open={openColorSelect}
        onClose={onCloseColorSelect}
        ref={anchorEl.current}
        uid={props.uid}
      />
    </>
  );
};

export default memo(UserListItem);
