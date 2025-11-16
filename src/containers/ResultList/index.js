import React, {
  memo,
  useCallback,
  useState,
  forwardRef,
  useEffect,
  useRef
} from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@mui/styles";
import {
  IconButton,
  List,
  Dialog,
  Toolbar,
  AppBar,
  Typography,
  Slide,
  ListSubheader
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackIos";

import ResultListListItem from "./ResultListListItem";
import ResultRecord from "./ResultRecord";

const SCROLL_THRESHOLD = 48;

const Transition = forwardRef((props, ref) => {
  return <Slide direction="left" ref={ref} {...props} />;
});

const useStyles = makeStyles(theme => ({
  appBar: {
    position: "sticky"
  },
  flex: {
    flex: 1
  },
  list: {
    overflowY: "auto",
    height: "100%",
    flex: "1 1 auto"
  },
  subheader: {
    backgroundColor: "#cfd8dc",
    textAlign: "center",
    lineHeight: "30px"
  }
}));

const ResultList = props => {
  const classes = useStyles();
  const d = useDispatch();
  const listRef = useRef(null);
  const [isOpenResult, setIsOpenResult] = useState(false);
  const [isOpenResultId, setIsOpenResultId] = useState("");

  const open = useSelector(state =>
    store.getAppState(state, "isOpenResultList")
  );
  const groups = useSelector(state => store.getResultsGroupedByDay(state));
  const loading = useSelector(state => store.getResultsLoading(state));
  const hasMore = useSelector(state => store.getResultsHasMore(state));
  const initialized = useSelector(state => store.getResultsInitialized(state));

  const handleScroll = useCallback(
    event => {
      const target = event.currentTarget;
      const isNearBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight <
        SCROLL_THRESHOLD;
      if (isNearBottom && !loading && hasMore) {
        d(store.fetchResultsPage());
      }
    },
    [loading, hasMore, d]
  );

  const ensureContentFillsViewport = useCallback(() => {
    const target = listRef.current;
    if (!target) {
      return;
    }
    const remaining = target.scrollHeight - target.clientHeight;
    if (remaining <= SCROLL_THRESHOLD && !loading && hasMore) {
      d(store.fetchResultsPage());
    }
  }, [loading, hasMore, d]);

  const onClose = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenResultList = false;
      })
    );
  }, [d]);
  const onSelect = useCallback(id => {
    setIsOpenResult(true);
    setIsOpenResultId(id);
  }, []);
  const onDeselect = useCallback(allClose => {
    setIsOpenResult(false);
  }, []);

  useEffect(() => {
    if (open) {
      d(store.fetchResultsPage({ reset: true }));
    }
  }, [open, d]);

  useEffect(() => {
    if (!open) {
      return;
    }
    ensureContentFillsViewport();
  }, [open, groups, ensureContentFillsViewport]);

  const hasData = groups.length > 0;

  return (
    <>
      <Dialog
        fullScreen
        open={open}
        onClose={onClose}
        TransitionComponent={Transition}
      >
        <AppBar className={classes.appBar}>
          <Toolbar>
            <IconButton color="inherit" onClick={onClose}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" color="inherit" className={classes.flex}>
              結果一覧
            </Typography>
          </Toolbar>
        </AppBar>
        <List ref={listRef} className={classes.list} onScroll={handleScroll}>
          {groups.map(group => (
            <React.Fragment key={group.day}>
              <ListSubheader className={classes.subheader}>
                {group.day}
              </ListSubheader>
              {group.resultIds.map(resultId => (
                <ResultListListItem
                  key={resultId}
                  resultId={resultId}
                  onSelect={onSelect}
                />
              ))}
            </React.Fragment>
          ))}
          {!loading && !hasData ? (
            <ListSubheader className={classes.subheader}>
              データがありません
            </ListSubheader>
          ) : null}
          {loading ? (
            <ListSubheader className={classes.subheader}>
              読み込み中...
            </ListSubheader>
          ) : null}
        </List>
      </Dialog>
      <ResultRecord
        open={isOpenResult}
        resultId={isOpenResultId}
        onClose={onDeselect}
      />
    </>
  );
};

export default memo(ResultList);
