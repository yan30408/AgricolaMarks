import React, {
  memo,
  useState,
  useCallback,
  forwardRef,
  useEffect
} from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@mui/styles";
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
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";

import AlertDialog from "components/AlertDialog";
import ResultListItem from "./ResultListItem";
import ResultDetail from "containers/ResultDetail";
import { GameModes, DEFAULT_GAME_MODE } from "Constants";

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
  const resultId = useSelector(state => store.getAppState(state, "resultId"));
  const resultDate = useSelector(state =>
    store.getAppState(state, "resultDate")
  );
  const gameMode = useSelector(
    state => store.getAppState(state, "gameMode") || DEFAULT_GAME_MODE
  );
  const gameModeLabel = GameModes[gameMode]?.label || gameMode;
  const [openNewGame, setOpenNewGame] = useState(false);
  const [isSave, setIsSave] = useState(true);
  const [openDetail, setOpenDetail] = useState(false);

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
    const sanitizedResults = sortedResult.map(player => ({
      ...player,
      ratingBefore:
        player.ratingBefore !== undefined ? player.ratingBefore : null,
      ratingAfter: player.ratingAfter !== undefined ? player.ratingAfter : null
    }));
    if (isSave && sortedResult.length > 0) {
      if (resultId !== null) {
        d(
          store.updateResult(resultId, {
            date: resultDate,
            results: sanitizedResults,
            gameMode
          })
        );
      } else {
        d(
          store.addResult({
            date: resultDate,
            results: sanitizedResults,
            gameMode
          })
        );
      }
    }
    d(
      store.appStateMutate(state => {
        state.currentOrder = 0;
        state.resultId = null;
        state.resultDate = null;
        state.isOpenResult = false;
      })
    );
    d(store.appResultsInit);
  }, [d, isSave, resultDate, sortedResult, resultId, gameMode]);
  const onDateChange = useCallback(date => {
    d(store.appStateMutate(state => (state.resultDate = date)));
  }, []);
  const onClickDetail = useCallback(() => {
    setOpenDetail(true);
  }, []);
  const onCloseDetail = useCallback(() => {
    setOpenDetail(false);
  }, []);

  useEffect(() => {
    if (open && resultDate === null) {
      d(store.appStateMutate(state => (state.resultDate = new Date())));
    }
    d(store.appPlayersUpdate());
  }, [open, resultDate, d]);

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
          <div className={classes.flex} />
          <Button
            onClick={onClickDetail}
            color="inherit"
            size="small"
            variant="outlined"
          >
            Detail
          </Button>
        </Toolbar>
      </AppBar>
      <List>
        <ListItem divider style={{ justifyContent: "center" }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              sx={{ textAlign: "center" }}
              format="yyyy.MM.dd - HH:mm:ss"
              value={resultDate}
              onChange={onDateChange}
              slotProps={{
                textField: { variant: "outlined" }
              }}
            />
          </LocalizationProvider>
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
            {resultId !== null ? "編集内容で上書きする" : "結果を記録する"}
            <SaveIcon className={classes.rightIcon} />
          </Button>
        </ListItem>
        {resultId !== null ? (
          <ListItem>
            <Button
              color="secondary"
              onClick={onClickNewGameWithNoSave}
              fullWidth
              variant="outlined"
            >
              編集内容を破棄する
            </Button>
          </ListItem>
        ) : null}
      </List>
      <AlertDialog
        title={
          resultId !== null
            ? isSave
              ? "編集内容で上書きします"
              : "編集内容を破棄します"
            : "結果を記録します"
        }
        isOpen={openNewGame}
        onClose={onCloseNewGame}
        onClickOk={onClickOkNewGame}
      >
        <Typography variant="body2">
          {resultId !== null ? (
            <>
              {isSave ? (
                `${gameModeLabel} のプレイ結果として上書きします。`
              ) : (
                <>
                  編集内容を破棄します。
                  <br />
                  元データはそのまま保持されます。
                </>
              )}
            </>
          ) : (
            `${gameModeLabel} のプレイ結果を記録します。`
          )}
          <br />
          本当によろしいですか？
        </Typography>
      </AlertDialog>
      <ResultDetail
        open={openDetail}
        onClose={onCloseDetail}
        results={sortedResult}
      />
    </Dialog>
  );
};

export default memo(FullScreenDialog);
