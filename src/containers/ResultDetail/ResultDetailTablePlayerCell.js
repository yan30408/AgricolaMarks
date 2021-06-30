import React, { memo } from "react";
import { useSelector } from "react-redux";
import store from "stores/interfaces";
import { Badge, Avatar, TableCell } from "@material-ui/core";
import { Orders, Colors } from "Constants";

const ResultDetailTablePlayer = props => {
  const player = useSelector(state => store.getUserById(state, props.uid));
  if (!player) return null;

  return (
    <TableCell
      align="center"
      size="small"
      padding="none"
      style={{
        paddingTop: "5px",
        paddingBottom: "7.5px",
        backgroundColor: Colors[props.color]?.sub
      }}
    >
      <Badge
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right"
        }}
        badgeContent={Orders[props.order]}
      >
        <Avatar
          src={player.photoUrl}
          alt={player.displayName}
          style={{ backgroundColor: Colors[props.color]?.main }}
        >
          {player.displayName?.substr(0, 1)}
        </Avatar>
      </Badge>
    </TableCell>
  );
};

export default memo(ResultDetailTablePlayer);
