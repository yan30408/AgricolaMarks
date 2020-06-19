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
import ArrowBackIcon from "@material-ui/icons/ArrowBackIos";
import DeleteIcon from "@material-ui/icons/Delete";

import AlertDialog from "components/AlertDialog";
import ResultRecordListItem from "./ResultRecordListItem";

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
  const resultId = useSelector(state =>
    store.getAppState(state, "openResultRecordId")
  );
  const result = useSelector(state => store.getResultById(state, resultId));
  const open = resultId !== 0;
  const [openDelete, setOpenDelete] = useState(false);

  const onClose = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.openResultRecordId = 0;
      })
    );
  }, [d]);
  const onClickDelete = useCallback(() => {
    setOpenDelete(true);
  }, []);
  const onCloseDelete = useCallback(() => {
    setOpenDelete(false);
  }, []);
  const onClickOkDelete = useCallback(() => {
    setOpenDelete(false);
  }, [d]);

  if (!result) return;

  return (
    <Dialog
      fullScreen
      open={resultId !== 0}
      onClose={onClose}
      TransitionComponent={Transition}
    >
      <AppBar className={classes.appBar}>
        <Toolbar>
          <IconButton color="inherit" onClick={onClose} aria-label="Close">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" color="inherit" className={classes.flex}>
            Result
          </Typography>
        </Toolbar>
      </AppBar>
      <List>
        <ListItem divider style={{ justifyContent: "center" }}>
          <Typography />
        </ListItem>
        {result.results.map(result => (
          <ResultRecordListItem key={result.uid} {...result} />
        ))}
        <ListItem>
          <Button
            color="secondary"
            onClick={onClickDelete}
            fullWidth
            variant="contained"
          >
            記録を削除する
            <DeleteIcon className={classes.rightIcon} />
          </Button>
        </ListItem>
      </List>
      <AlertDialog
        title={"記録を削除します"}
        isOpen={openDelete}
        onClose={onCloseDelete}
        onClickOk={onClickOkDelete}
      >
        本当によろしいですか？
      </AlertDialog>
    </Dialog>
  );
};

export default memo(ResultRecord);
