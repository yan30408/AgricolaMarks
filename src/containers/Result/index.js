import React, {
  memo,
  useState,
  useCallback,
  forwardRef,
  useEffect
} from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@material-ui/core/styles";
import {
  Button,
  IconButton,
  List,
  ListItem,
  Toolbar,
  Dialog,
  AppBar,
  Typography,
  Slide
} from "@material-ui/core";
import {
  KeyboardDateTimePicker,
  MuiPickersUtilsProvider
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";

import CloseIcon from "@material-ui/icons/Close";
import SaveIcon from "@material-ui/icons/Save";
import DeleteIcon from "@material-ui/icons/Delete";

import AlertDialog from "components/AlertDialog";
import ResultListItem from "./ResultListItem";

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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSave, setIsSave] = useState(true);

  const onClose = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenResult = false;
      })
    );
  }, [d]);
  const onClickNewGameWithSave = useCallback(() => {
    setOpenNewGame(true);
    setIsSave(true);
  }, []);
  const onClickNewGameWithNoSave = useCallback(() => {
    setOpenNewGame(true);
    setIsSave(false);
  }, []);
  const onCloseNewGame = useCallback(() => {
    setOpenNewGame(false);
  }, []);
  const onClickOkNewGame = useCallback(() => {
    setOpenNewGame(false);
    if (isSave && sortedResult.length > 0) {
      d(store.addResult({ date: selectedDate, results: sortedResult }));
    }
    d(
      store.appStateMutate(state => {
        state.currentOrder = 0;
        state.isOpenResult = false;
      })
    );
    d(store.appResultsInit);
  }, [d, isSave, selectedDate, sortedResult]);
  const onDateChange = useCallback(date => {
    setSelectedDate(date);
  }, []);

  useEffect(() => {
    setSelectedDate(new Date());
  }, [open]);

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
        <ListItem divider style={{ justifyContent: "center" }}>
          <MuiPickersUtilsProvider utils={DateFnsUtils}>
            <KeyboardDateTimePicker
              style={{ textAlign: "center" }}
              format="yyyy.MM.dd - HH:mm:ss"
              inputVariant="outlined"
              value={selectedDate}
              onChange={onDateChange}
            />
          </MuiPickersUtilsProvider>
        </ListItem>
        {sortedResult.map(result => (
          <ResultListItem key={result.uid} {...result} />
        ))}
        <ListItem>
          <Button
            color="primary"
            onClick={onClickNewGameWithSave}
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
            onClick={onClickNewGameWithNoSave}
            fullWidth
            variant="contained"
          >
            結果を破棄する
            <DeleteIcon className={classes.rightIcon} />
          </Button>
        </ListItem>
      </List>
      <AlertDialog
        title={isSave ? "結果を記録します" : "結果を破棄します"}
        isOpen={openNewGame}
        onClose={onCloseNewGame}
        onClickOk={onClickOkNewGame}
      >
        本当によろしいですか？
      </AlertDialog>
    </Dialog>
  );
};

export default memo(FullScreenDialog);
