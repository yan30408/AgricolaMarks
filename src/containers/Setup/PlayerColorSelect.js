import React, { memo, useCallback, forwardRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { Menu, MenuItem, ListItemText } from "@material-ui/core";
import { Colors } from "Constants";

const PlayerColorSelect = forwardRef((props, ref) => {
  return (
    <Menu
      open={props.open}
      onClose={() => props.onClose()}
      anchorEl={ref}
      PaperProps={{
        style: {
          width: "215px"
        }
      }}
    >
      {Object.keys(Colors).map(key => (
        <PlayerColorSelectItem {...props} key={key} colorId={key} />
      ))}
    </Menu>
  );
});

const PlayerColorSelectItem = forwardRef((props, ref) => {
  const { colorId, uid, onClose } = props;
  const d = useDispatch();
  const user = useSelector(state => store.getUserById(state, uid));
  const player = useSelector(state =>
    store.getAppCurrentPlayer(state, colorId)
  );

  const onSelect = useCallback(() => {
    d(store.appPlayersSet(player?.uid === uid ? null : colorId, user));
    onClose();
  }, [d, colorId, user, player, uid, onClose]);

  const menuLabel = useMemo(() => {
    if (player?.uid) {
      return player.uid === uid ? "登録を解除する" : "プレイヤーを置き換える";
    }
    return "登録する";
  }, [player, uid]);

  return (
    <MenuItem
      style={{
        backgroundColor: Colors[colorId].sub,
        color: Colors[colorId].main
      }}
      onClick={onSelect}
    >
      <ListItemText
        primary={menuLabel}
        secondary={player?.name}
        secondaryTypographyProps={{ noWrap: true }}
      />
    </MenuItem>
  );
});

export default memo(PlayerColorSelect);
