import React, {
  memo,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@mui/styles";
import {
  AppBar,
  Dialog,
  IconButton,
  List,
  ListSubheader,
  Slide,
  Toolbar,
  Typography
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackIos";

import ResultListListItem from "containers/ResultList/ResultListListItem";
import ResultRecord from "containers/ResultList/ResultRecord";

import { db } from "initializer";
import { RESULTS_PAGE_SIZE } from "stores/modules/entities.results/types";
import { format } from "date-fns";

const SCROLL_THRESHOLD = 48;

const Transition = forwardRef((props, ref) => {
  return <Slide direction="left" ref={ref} {...props} />;
});

const useStyles = makeStyles({
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
});

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

const formatDayKey = value => {
  const date = toDate(value);
  if (!date) {
    return "Unknown";
  }
  try {
    return format(date, "yyyy/MM/dd");
  } catch (error) {
    return "Unknown";
  }
};

const PlayerResultHistoryDialog = props => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { open, uid, mode, onClose } = props;

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isOpenResult, setIsOpenResult] = useState(false);
  const [activeResultId, setActiveResultId] = useState("");

  const listRef = useRef(null);
  const cursorRef = useRef(null);
  const loadingRef = useRef(false);
  const fetchedIdsRef = useRef(new Set());

  const results = useSelector(
    state => entries.map(id => store.getResultById(state, id)),
    shallowEqual
  );

  const items = useMemo(() => {
    return entries.map((id, index) => {
      const result = results[index] || null;
      const playedAt = result?.playedAt || result?.date || null;
      const dayKey = formatDayKey(playedAt);
      let showHeader = false;
      if (index === 0) {
        showHeader = true;
      } else {
        const previous = results[index - 1] || null;
        const previousKey = formatDayKey(
          previous?.playedAt || previous?.date || null
        );
        showHeader = dayKey !== previousKey;
      }
      return {
        resultId: id,
        dayKey,
        showHeader
      };
    });
  }, [entries, results]);

  const setLoadingState = useCallback(value => {
    loadingRef.current = value;
    setLoading(value);
  }, []);

  const fetchPage = useCallback(
    async (reset = false) => {
      if (!uid || loadingRef.current) {
        return;
      }
      setLoadingState(true);
      try {
        let query = db
          .collection("users")
          .doc(uid)
          .collection("stats");
        if (mode) {
          query = query.where("gameMode", "==", mode);
        }
        query = query.orderBy("playedAt", "desc").limit(RESULTS_PAGE_SIZE);
        if (!reset && cursorRef.current) {
          query = query.startAfter(cursorRef.current);
        }
        const snapshot = await query.get();
        const docs = snapshot.docs.filter(doc => {
          if (doc.id === "summary") return false;
          const data = doc.data() || {};
          if (data.type === "summary") return false;
          return true;
        });
        if (reset) {
          fetchedIdsRef.current = new Set();
        }
        const nextIds = [];
        for (const doc of docs) {
          const resultId = doc.id;
          if (!resultId || fetchedIdsRef.current.has(resultId)) {
            continue;
          }
          fetchedIdsRef.current.add(resultId);
          const result = await dispatch(store.ensureResultById(resultId));
          if (result) {
            nextIds.push(resultId);
          }
        }
        if (docs.length > 0) {
          cursorRef.current = docs[docs.length - 1];
        }
        setEntries(prev => (reset ? nextIds : [...prev, ...nextIds]));
        setHasMore(docs.length === RESULTS_PAGE_SIZE);
      } catch (error) {
        console.error("Failed to fetch player result history", error);
      } finally {
        setLoadingState(false);
      }
    },
    [dispatch, mode, setLoadingState, uid]
  );

  const handleScroll = useCallback(
    event => {
      if (!hasMore || loadingRef.current) {
        return;
      }
      const target = event.currentTarget;
      const isNearBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight <
        SCROLL_THRESHOLD;
      if (isNearBottom) {
        fetchPage(false);
      }
    },
    [fetchPage, hasMore]
  );

  const ensureInitialPage = useCallback(() => {
    const target = listRef.current;
    if (!target || !hasMore || loadingRef.current) {
      return;
    }
    const remaining = target.scrollHeight - target.clientHeight;
    if (remaining <= SCROLL_THRESHOLD) {
      fetchPage(false);
    }
  }, [fetchPage, hasMore]);

  useEffect(() => {
    if (!open || !uid) {
      return;
    }
    setEntries([]);
    setHasMore(true);
    cursorRef.current = null;
    fetchedIdsRef.current = new Set();
    fetchPage(true);
  }, [fetchPage, open, uid, mode]);

  useEffect(() => {
    if (!open) {
      setIsOpenResult(false);
      setActiveResultId("");
      return;
    }
    ensureInitialPage();
  }, [open, entries.length, ensureInitialPage]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(resultId => {
    setActiveResultId(resultId);
    setIsOpenResult(true);
  }, []);

  const handleResultClose = useCallback(() => {
    setIsOpenResult(false);
  }, []);

  const hasData = entries.length > 0;

  return (
    <>
      <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}
      >
        <AppBar className={classes.appBar}>
          <Toolbar>
            <IconButton color="inherit" onClick={handleClose}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" color="inherit" className={classes.flex}>
              戦績一覧
            </Typography>
          </Toolbar>
        </AppBar>
        <List ref={listRef} className={classes.list} onScroll={handleScroll}>
          {items.map(item => (
            <React.Fragment key={item.resultId}>
              {item.showHeader ? (
                <ListSubheader className={classes.subheader}>
                  {item.dayKey}
                </ListSubheader>
              ) : null}
              <ResultListListItem
                resultId={item.resultId}
                onSelect={handleSelect}
              />
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
        resultId={activeResultId}
        onClose={handleResultClose}
      />
    </>
  );
};

export default memo(PlayerResultHistoryDialog);
