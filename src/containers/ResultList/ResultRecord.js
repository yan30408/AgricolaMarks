import React, { memo, useState, useCallback, forwardRef } from "react";
import { useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@material-ui/core/styles";
import {
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Toolbar,
  Dialog,
  AppBar,
  Typography,
  Slide
} from "@material-ui/core";
import ArrowBackIcon from "@material-ui/icons/ArrowBackIos";
import DeleteIcon from "@material-ui/icons/Delete";

import ResultRecordListItem from "./ResultRecordListItem";
import PlayerStatistics from "containers/PlayerStatistics";

import { format } from "date-fns";

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

const ResultRecord = props => {
  const classes = useStyles();
  const { open, resultId } = props;
  const result = useSelector(state => store.getResultById(state, resultId));
  const [isOpenPlayerStatistics, setIsOpenPlayerStatistics] = useState(false);
  const [isOpenPlayerStatisticsId, setIsOpenPlayerStatisticsId] = useState("");

  const onSelect = useCallback(id => {
    setIsOpenPlayerStatistics(true);
    setIsOpenPlayerStatisticsId(id);
  }, []);
  const onDeselect = useCallback(id => {
    setIsOpenPlayerStatistics(false);
  }, []);

  if (!result) return;
  const date = format(
    new Date(result.date.seconds * 1000 + result.date.nanoseconds / 1000000),
    "yyyy.MM.dd - HH:mm:ss"
  );

  return (
    <>
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
              Result
            </Typography>
          </Toolbar>
        </AppBar>
        <List>
          <ListItem divider>
            <ListItemText>
              <Typography variant="h6" align="center">
                {date}
              </Typography>
            </ListItemText>
          </ListItem>
          {result.results
            .sort((a, b) => b.score.total - a.score.total)
            .map(result => (
              <ResultRecordListItem
                key={result.uid}
                {...result}
                onSelect={onSelect}
              />
            ))}
          <ListItem>
            <Button color="secondary" fullWidth variant="contained" disabled>
              記録を削除する
              <DeleteIcon className={classes.rightIcon} />
            </Button>
          </ListItem>
        </List>
      </Dialog>
      <PlayerStatistics
        open={isOpenPlayerStatistics}
        uid={isOpenPlayerStatisticsId}
        onClose={onDeselect}
      />
    </>
  );
};

export default memo(ResultRecord);
