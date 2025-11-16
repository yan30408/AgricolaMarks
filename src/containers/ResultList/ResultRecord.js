import React, { memo, useState, useCallback, forwardRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@mui/styles";
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
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackIos";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import AlertDialog from "components/AlertDialog";
import ResultRecordListItem from "./ResultRecordListItem";
import PlayerStatistics from "containers/PlayerStatistics";
import ResultDetail from "containers/ResultDetail";

import { format } from "date-fns";
import { GameModes, DEFAULT_GAME_MODE } from "Constants";

const DEFAULT_RATING_LOCK_MESSAGE =
  "現在レーティング再計算を実行中です。\n完了までお待ちください。";

const toDate = value => {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    return value.toDate();
  }
  if (value?.seconds !== undefined) {
    return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6);
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

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
  },
  dateRow: {
    paddingTop: theme.spacing(0.1),
    paddingBottom: theme.spacing(0.1)
  }
}));

const ResultRecord = props => {
  const classes = useStyles();
  const d = useDispatch();
  const { open, resultId } = props;
  const result = useSelector(state => store.getResultById(state, resultId));
  const uid = useSelector(state => store.getAppState(state, "uid"));
  const isRatingLocked = useSelector(state =>
    Boolean(store.getAppState(state, "isRatingRebuildLocked"))
  );
  const ratingLockMessage =
    useSelector(state => store.getAppState(state, "ratingRebuildMessage")) ||
    DEFAULT_RATING_LOCK_MESSAGE;
  const ratingLockMessageLines = useMemo(() => {
    if (!ratingLockMessage) return [];
    if (ratingLockMessage.includes("\n")) {
      return ratingLockMessage
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    }
    return ratingLockMessage
      .split(/(?<=。)/)
      .map(line => line.trim())
      .filter(Boolean);
  }, [ratingLockMessage]);
  const [isOpenPlayerStatistics, setIsOpenPlayerStatistics] = useState(false);
  const [isOpenPlayerStatisticsId, setIsOpenPlayerStatisticsId] = useState("");
  const [openDetail, setOpenDetail] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [isEdit, setIsEdit] = useState(true);

  const onSelect = useCallback(id => {
    setIsOpenPlayerStatistics(true);
    setIsOpenPlayerStatisticsId(id);
  }, []);
  const onDeselect = useCallback(
    allClose => {
      if (allClose === true) props.onClose(true);
      setIsOpenPlayerStatistics(false);
    },
    [props.onClose]
  );
  const onClickDetail = useCallback(() => {
    setOpenDetail(true);
  }, []);
  const onCloseDetail = useCallback(() => {
    setOpenDetail(false);
  }, []);
  const onClickDelete = useCallback(() => {
    if (isRatingLocked) {
      return;
    }
    setOpenConfirm(true);
    setIsEdit(false);
  }, [isRatingLocked]);
  const onClickEdit = useCallback(() => {
    if (isRatingLocked) {
      return;
    }
    setOpenConfirm(true);
    setIsEdit(true);
  }, [isRatingLocked]);
  const onCloseConfirm = useCallback(() => {
    setOpenConfirm(false);
  }, []);
  const confirmDialogTitle = useMemo(
    () => (isEdit ? "記録を編集します" : "記録を削除します"),
    [isEdit]
  );
  const confirmDialogBody = useMemo(() => {
    if (isEdit) {
      return (
        <>
          記録の編集画面に切り替えます。
          <br />
          このまま進めてもよろしいですか？
        </>
      );
    }
    return (
      <>
        記録を削除するとレーティング再計算を行います。
        <br />
        処理には数分かかる場合があります。
        <br />
        このまま進めてもよろしいですか？
      </>
    );
  }, [isEdit]);

  const onClickOkConfirm = useCallback(() => {
    setOpenConfirm(false);
    if (isEdit) {
      d(store.appResultsApply(resultId));
      d(
        store.appStateMutate(state => {
          state.isOpenMenu = false;
          state.isOpenPlayerList = false;
          state.isOpenResultList = false;
          state.isOpenStatistics = false;
        })
      );
    } else {
      d(store.deleteResult(resultId, { skipConfirm: true }));
    }
    props.onClose(true);
  }, [d, isEdit, resultId, props.onClose]);

  const sortedResults = useMemo(() => {
    if (!result || !Array.isArray(result.results)) {
      return [];
    }
    return [...result.results].sort(
      (a, b) => (b?.score?.total || 0) - (a?.score?.total || 0)
    );
  }, [result]);
  const isParticipant = sortedResults.some(entry => entry.uid === uid);
  const isAdmin = useSelector(state =>
    Boolean(store.getAppState(state, "isAdmin"))
  );

  if (!result) return null;
  const playedAtDate = toDate(result.playedAt || result.date);
  const date = playedAtDate
    ? format(playedAtDate, "yyyy.MM.dd - HH:mm:ss")
    : "-";
  const gameMode = result.gameMode || DEFAULT_GAME_MODE;
  const gameModeLabel = GameModes[gameMode]?.label || gameMode;

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
          <ListItem divider className={classes.dateRow}>
            <ListItemText
              primary={
                <Typography variant="h6" align="center">
                  {date}
                </Typography>
              }
              secondary={
                <Typography
                  variant="caption"
                  align="center"
                  display="block"
                  color="textSecondary"
                >
                  {gameModeLabel}
                </Typography>
              }
            />
          </ListItem>
          {sortedResults.map(result => (
            <ResultRecordListItem
              key={result.uid}
              {...result}
              onSelect={onSelect}
            />
          ))}
          <ListItem>
            <Button
              color="primary"
              onClick={onClickEdit}
              fullWidth
              disabled={(!isParticipant && !isAdmin) || isRatingLocked}
              variant="contained"
            >
              記録を編集する
              <EditIcon className={classes.rightIcon} />
            </Button>
          </ListItem>
          <ListItem>
            <Button
              color="secondary"
              onClick={onClickDelete}
              fullWidth
              disabled={!isAdmin || isRatingLocked}
              variant="contained"
            >
              記録を削除する
              <DeleteIcon className={classes.rightIcon} />
            </Button>
          </ListItem>
          {isRatingLocked ? (
            <ListItem>
              <Typography
                variant="body2"
                color="error"
                align="center"
                style={{ width: "100%" }}
              >
                {ratingLockMessageLines.map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < ratingLockMessageLines.length - 1 ? <br /> : null}
                  </React.Fragment>
                ))}
              </Typography>
            </ListItem>
          ) : null}
        </List>
        <AlertDialog
          title={confirmDialogTitle}
          isOpen={openConfirm}
          onClose={onCloseConfirm}
          onClickOk={onClickOkConfirm}
        >
          {confirmDialogBody}
        </AlertDialog>
      </Dialog>
      <PlayerStatistics
        open={isOpenPlayerStatistics}
        uid={isOpenPlayerStatisticsId}
        onClose={onDeselect}
      />
      <ResultDetail
        open={openDetail}
        onClose={onCloseDetail}
        results={result.results}
      />
    </>
  );
};

export default memo(ResultRecord);
