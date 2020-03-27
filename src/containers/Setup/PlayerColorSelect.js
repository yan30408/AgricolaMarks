import React, { memo, useCallback, forwardRef } from "react";
import { useDispatch } from "react-redux";
import store from "stores/interfaces";
import { Menu, MenuItem } from "@material-ui/core";
import { Colors } from "Constants";

const PlayerColorSelect = forwardRef((props, ref) => {
  return (
    <Menu open={props.open} onClose={() => props.onClose()} anchorEl={ref}>
      {Object.keys(Colors).map(key => (
        <PlayerColorSelectItem {...props} key={key} colorId={key} />
      ))}
      <PlayerColorSelectItem {...props} key="blank" colorId={"blank"} />
    </Menu>
  );
});

const PlayerColorSelectItem = memo(props => {
  const d = useDispatch();
  const onSelect = useCallback(() => {
    d(store.appPlayersSet(props.colorId, props.uid));
    props.onClose();
  }, [d, props.colorId, props.uid]);
  return (
    <MenuItem
      style={{ backgroundColor: Colors[props.colorId]?.sub }}
      onClick={onSelect}
    >
      {props.colorId}
    </MenuItem>
  );
});

export default memo(PlayerColorSelect);
