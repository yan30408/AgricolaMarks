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
    setOpenConfirm(true);
    setIsEdit(false);
  }, []);
  const onClickEdit = useCallback(() => {
    setOpenConfirm(true);
    setIsEdit(true);
  }, []);
  const onCloseConfirm = useCallback(() => {
    setOpenConfirm(false);
  }, []);
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
      d(store.deleteResult(resultId));
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
              disabled={!isParticipant && !isAdmin}
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
              disabled={!isAdmin}
              variant="contained"
            >
              記録を削除する
              <DeleteIcon className={classes.rightIcon} />
            </Button>
          </ListItem>
        </List>
        <AlertDialog
          title={isEdit ? "記録を編集します" : "記録を削除します"}
          isOpen={openConfirm}
          onClose={onCloseConfirm}
          onClickOk={onClickOkConfirm}
        >
          本当によろしいですか？
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
