import React, { memo } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Tooltip, TableRow, TableCell, Typography } from "@material-ui/core";
import { Colors } from "Constants";
import { imageUrl } from "containers/CalcForm/data";

const useStyles = makeStyles(theme => ({
  scoreOnly: {
    fontSize: "1.2rem"
  },
  score: {
    fontSize: "1.2rem",
    height: "1.25rem"
  },
  value: {
    fontSize: "0.7rem",
    color: theme.palette.text.secondary
  }
}));

const ResultDetailTableRow = props => {
  const classes = useStyles();
  const noLabels = ["Improvement", "Bonus", "Unused Spaces", "Stable"];
  return (
    <TableRow>
      <TableCell
        align="center"
        size="small"
        padding="none"
        style={{ padding: "3px 0px" }}
      >
        <Tooltip title={props.id}>
          <img
            src={imageUrl[props.id == "Rooms" ? "Wood Rooms" : props.id]}
            width={30}
            height={30}
            alt={props.id}
            style={{ verticalAlign: "bottom" }}
          />
        </Tooltip>
      </TableCell>
      {props.results.map(result => {
        const noLabel = noLabels.indexOf(props.id) != -1;
        return (
          <TableCell
            align="center"
            size="small"
            padding="none"
            style={{ backgroundColor: Colors[result.color]?.sub }}
          >
            <Typography className={noLabel ? classes.scoreOnly : classes.score}>
              {result.category[props.id].score}
            </Typography>
            {noLabel ? null : (
              <Typography className={classes.value}>
                (
                {props.labels
                  ? props.labels[result.category[props.id].value]
                  : result.category[props.id].value}
                )
              </Typography>
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
};

export default memo(ResultDetailTableRow);
