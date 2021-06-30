import React, { memo } from "react";
import { Typography, TableCell } from "@material-ui/core";
import { Colors } from "Constants";

const ResultDetailTableScoreCell = props => {
  return (
    <TableCell
      align="center"
      size="small"
      padding="none"
      style={{ backgroundColor: Colors[props.color]?.sub }}
    >
      <Typography variant="h5">{props.score.total}</Typography>
    </TableCell>
  );
};

export default memo(ResultDetailTableScoreCell);
