import React, { memo, forwardRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  IconButton,
  Toolbar,
  Dialog,
  AppBar,
  Typography,
  Slide,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow
} from "@material-ui/core";

import ArrowBackIcon from "@material-ui/icons/ArrowBackIos";
import ResultDetailTableRow from "./ResultDetailTableRow";
import ResultDetailTablePlayerCell from "./ResultDetailTablePlayerCell";
import ResultDetailTableScoreCell from "./ResultDetailTableScoreCell";

import { fixedButtonData, linearButtonData } from "containers/CalcForm/data";

const Transition = forwardRef((props, ref) => {
  return <Slide direction="left" ref={ref} {...props} />;
});

const useStyles = makeStyles(theme => ({
  appBar: {
    position: "relative"
  },
  flex: {
    flex: 1
  },
  button: {
    margin: theme.spacing(1)
  },
  rightIcon: {
    marginLeft: theme.spacing(1)
  }
}));

const ResultDetail = props => {
  const classes = useStyles();
  const { open, results } = props;

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={props.onClose}
      TransitionComponent={Transition}
    >
      <AppBar className={classes.appBar}>
        <Toolbar>
          <IconButton
            color="inherit"
            onClick={props.onClose}
            aria-label="Close"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" color="inherit" className={classes.flex}>
            Result Detail
          </Typography>
        </Toolbar>
      </AppBar>
      <TableContainer>
        <Table
          className={classes.table}
          size="small"
          aria-label="a dense table"
        >
          <TableBody>
            <TableRow>
              <TableCell padding="none" size="small"></TableCell>
              {results.map(result => {
                return <ResultDetailTablePlayerCell {...result} />;
              })}
            </TableRow>
            <TableRow>
              <TableCell align="center" padding="none" size="small">
                <Typography variant="subtitle2">Score</Typography>
              </TableCell>
              {results.map(result => {
                return <ResultDetailTableScoreCell {...result} />;
              })}
            </TableRow>
            {fixedButtonData.map(data => (
              <ResultDetailTableRow key={data.id} {...data} results={results} />
            ))}
            {linearButtonData.map(data => (
              <ResultDetailTableRow key={data.id} {...data} results={results} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Dialog>
  );
};

export default memo(ResultDetail);
