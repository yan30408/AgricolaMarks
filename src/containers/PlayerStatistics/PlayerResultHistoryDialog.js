import React, {
  memo,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
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

import { RESULTS_PAGE_SIZE } from "stores/modules/entities.results/types";
import { DEFAULT_GAME_MODE } from "Constants";
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
  const modeKey = mode || DEFAULT_GAME_MODE;

  const [visibleCount, setVisibleCount] = useState(RESULTS_PAGE_SIZE);
  const [isOpenResult, setIsOpenResult] = useState(false);
  const [activeResultId, setActiveResultId] = useState("");

  const resultIds = useSelector(state =>
    store.getUserResultIdsByMode(state, uid, modeKey)
  );
  const totalCount = Array.isArray(resultIds) ? resultIds.length : 0;

  const visibleIds = useMemo(() => {
    if (!totalCount) {
      return [];
    }
    return resultIds.slice(0, visibleCount);
  }, [resultIds, totalCount, visibleCount]);

  useEffect(() => {
    if (!open || !uid) return;
    dispatch(
      store.ensureUserStatsById(uid, {
        gameMode: modeKey
      })
    );
  }, [dispatch, modeKey, open, uid]);

  useEffect(() => {
    if (!open) return;
    visibleIds.forEach(id => {
      dispatch(store.ensureResultById(id));
    });
  }, [dispatch, open, visibleIds]);

  useEffect(() => {
    if (!open) {
      setVisibleCount(RESULTS_PAGE_SIZE);
      setIsOpenResult(false);
      setActiveResultId("");
      return;
    }
    setVisibleCount(RESULTS_PAGE_SIZE);
  }, [open, uid, modeKey]);

  const results = useSelector(
    state => visibleIds.map(id => store.getResultById(state, id)),
    shallowEqual
  );

  const items = useMemo(() => {
    return visibleIds.map((id, index) => {
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
  }, [results, visibleIds]);

  const hasMore = totalCount > 0 && visibleCount < totalCount;

  const handleScroll = useCallback(
    event => {
      if (!hasMore) {
        return;
      }
      const target = event.currentTarget;
      const isNearBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight <
        SCROLL_THRESHOLD;
      if (isNearBottom) {
        setVisibleCount(prev => Math.min(prev + RESULTS_PAGE_SIZE, totalCount));
      }
    },
    [hasMore, totalCount]
  );

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

  const hasData = totalCount > 0;

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
              Match History
            </Typography>
          </Toolbar>
        </AppBar>
        <List className={classes.list} onScroll={handleScroll}>
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
          {!open || hasData ? null : (
            <ListSubheader className={classes.subheader}>
              データがありません
            </ListSubheader>
          )}
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
