import React, { memo, useState, useCallback, forwardRef } from "react";
import { useDispatch, useSelector } from "react-redux";
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
import CloseIcon from "@material-ui/icons/Close";
import SaveIcon from "@material-ui/icons/Save";
import DeleteIcon from "@material-ui/icons/Delete";

import AlertDialog from "components/AlertDialog";
import ResultListItem from "./ResultListItem";
import { format } from "date-fns";

const Transition = forwardRef((props, ref) => {
  return <Slide direction="down" ref={ref} {...props} />;
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

const FullScreenDialog = props => {
  const classes = useStyles();
  const d = useDispatch();
  const open = useSelector(state => store.getAppState(state, "isOpenResult"));
  const sortedResult = useSelector(state => store.getSortedResult(state));
  const [openNewGame, setOpenNewGame] = useState(false);
  const onClose = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenResult = false;
      })
    );
  }, [d]);
  const onClickNewGame = useCallback(() => {
    setOpenNewGame(true);
  }, []);
  const onCloseNewGame = useCallback(() => {
    setOpenNewGame(false);
  }, []);
  const onClickOkNewGame = useCallback(() => {
    setOpenNewGame(false);
    d(
      store.appStateMutate(state => {
        state.currentOrder = 0;
        state.isOpenResult = false;
      })
    );
    d(store.appResultsInit);
  }, [d]);
  const date = format(new Date(), "yyyy.MM.dd - HH:mm:ss");

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
    >
      <AppBar className={classes.appBar}>
        <Toolbar>
          <IconButton color="inherit" onClick={onClose} aria-label="Close">
            <CloseIcon />
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
        {sortedResult.map(result => (
          <ResultListItem key={result.uid} {...result} />
        ))}
        <ListItem>
          <Button
            color="primary"
            onClick={onClickNewGame}
            fullWidth
            variant="contained"
          >
            結果を記録する
            <SaveIcon className={classes.rightIcon} />
          </Button>
        </ListItem>
        <ListItem>
          <Button
            color="secondary"
            onClick={onClickNewGame}
            fullWidth
            variant="contained"
          >
            結果を破棄する
            <DeleteIcon className={classes.rightIcon} />
          </Button>
        </ListItem>
      </List>
      <AlertDialog
        title="Start New Game ?"
        isOpen={openNewGame}
        onClose={onCloseNewGame}
        onClickOk={onClickOkNewGame}
      >
        新しいゲームを始めますか？
      </AlertDialog>
    </Dialog>
  );
};

export default memo(FullScreenDialog);
