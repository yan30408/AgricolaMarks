import React, { memo, useCallback, forwardRef } from "react";
import { useDispatch } from "react-redux";
import store from "stores/interfaces";
import { MenuItem } from "@material-ui/core";

const RecentPlayerListItem = forwardRef((props, ref) => {
  const { name, playerIndex } = props;
  const d = useDispatch();

  const onChoseRecentPlayer = useCallback(() => {
    props.onClose();
    d(
      store.appPlayersMutate(players => {
        players.current[playerIndex].name = name;
      })
    );
  }, [d, props, playerIndex, name]);

  return (
    <MenuItem ref={ref} onClick={onChoseRecentPlayer} divider>
      {name}
    </MenuItem>
  );
});

export default memo(RecentPlayerListItem);
