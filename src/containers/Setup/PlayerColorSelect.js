import React, {
  memo,
  useCallback,
  useState,
  useMemo,
  useRef,
  useEffect
} from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import {
  Dialog,
  AppBar,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Menu,
  MenuItem,
  useRadioGroup
} from "@material-ui/core";
import { Colors } from "Constants";

const PlayerColorSelect = props => {
  return (
    <Menu open={props.open} onClose={() => props.onClose()}>
      {Object.keys(Colors).map(key => (
        <PlayerColorSelectItem key={key} uid={props.uid} colorId={key} />
      ))}
      <PlayerColorSelectItem key="blank" uid={props.uid} colorId={"blank"} />
    </Menu>
  );
};

const PlayerColorSelectItem = memo(props => {
  const d = useDispatch();
  const players = useSelector(state => store.getAppCurrentPlayers(state));
  const player = useSelector(state =>
    store.getAppCurrentPlayerById(state, props.uid)
  );
  const playerIndex = players;

  const onSelect = useCallback(() => {
    // const preIndex = findIndex(players, {uid: props.uid});
    // if(preIndex !== -1) {
    //   d(
    //     store.appPlayersMutate(players => {
    //       players.current[preIndex].uid = null;
    //     })
    //   );
    // }
    // const index = findIndex(players, {colorId: props.uid});
    // if(index !== -1) {
    //   d(
    //     store.appPlayersMutate(players => {
    //       players.current[index].uid = props.uid;
    //     })
    //   );
    // }
  }, [d, props.uid]);
  return (
    <MenuItem
      style={{ backgroundColor: Colors[props.colorId].sub }}
      onClick={onSelect}
    >
      {props.colorId}
    </MenuItem>
  );
});

export default memo(PlayerColorSelect);
