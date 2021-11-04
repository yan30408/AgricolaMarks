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
import ArrowBackIcon from "@material-ui/icons/ArrowBackIos";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";

import AlertDialog from "components/AlertDialog";
import ResultRecordListItem from "./ResultRecordListItem";
import PlayerStatistics from "containers/PlayerStatistics";
import ResultDetail from "containers/ResultDetail";

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

  if (!result) return;
  const date = format(
    new Date(result.date.seconds * 1000 + result.date.nanoseconds / 1000000),
    "yyyy.MM.dd - HH:mm:ss"
  );
  const isParticipant = result.results.some(result => result.uid === uid);
  const isAdmin = uid === "RnsWdmQu9MdJ1U87GP5XBnGbqOC2";

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
            <Button
              color="primary"
              onClick={onClickEdit}
              fullWidth
              disabled={!isParticipant}
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
