import React, {
  memo,
  useState,
  useCallback,
  forwardRef,
  useEffect,
  useMemo
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
import { toEloRating } from "containers/PlayerList/ratingUtils";
import {
  createInitialState as createPreviewState,
  conservativeRating as previewConservativeRating,
  createStateFromSummary,
  rateMatch as previewRateMatch
} from "utils/trueskillPreview";

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

const assignRanks = results => {
  const sorted = [...results].sort(
    (a, b) => (b.score?.total ?? 0) - (a.score?.total ?? 0)
  );
  const rankMap = new Map();
  let currentRank = 1;
  let previousScore = null;
  sorted.forEach((entry, index) => {
    const score = entry.score?.total ?? 0;
    if (previousScore !== null && score < previousScore) {
      currentRank = index + 1;
    }
    if (entry.uid) {
      rankMap.set(entry.uid, currentRank);
    }
    previousScore = score;
  });
  return rankMap;
};

const buildPreviewEntries = (results, gameMode) => {
  const valid = results.filter(result => result.uid && result.uid !== -1);
  const participantCount = valid.length;
  if (participantCount === 0) {
    return [];
  }
  const rankMap = assignRanks(valid);
  return valid.map(result => ({
    resultId: `preview-${result.uid}`,
    uid: result.uid,
    rank: rankMap.get(result.uid) || participantCount,
    order: Number.isFinite(result.order) ? result.order : 0,
    score: result.score?.total ?? 0,
    color: result.color || null,
    playedAt: null,
    participantCount,
    gameMode
  }));
};

const DEFAULT_RATING_LOCK_MESSAGE =
  "現在レーティング再計算を実行中です。\n完了までお待ちください。";

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
  const [ratingPreview, setRatingPreview] = useState({});
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

  const saveButtonLabel =
    resultId !== null ? "編集内容で上書きする" : "結果を記録する";
  const discardButtonLabel = "編集結果を破棄する";

  const dialogTitle = useMemo(() => {
    if (resultId !== null) {
      return isSave ? "編集内容で上書きします" : "編集内容を破棄します";
    }
    return "結果を記録します";
  }, [resultId, isSave]);

  const dialogBody = useMemo(() => {
    if (resultId !== null) {
      if (isSave) {
        return (
          <>
            {`${gameModeLabel} のプレイ結果として編集内容で上書きします。`}
            <br />
            レーティング再計算を行うため、処理には数分かかる場合があります。
            <br />
            このまま進めてもよろしいですか？
          </>
        );
      }
      return (
        <>
          編集内容を破棄します。
          <br />
          元データはそのまま保持されます。
          <br />
          このまま進めてもよろしいですか？
        </>
      );
    }
    return (
      <>
        {`${gameModeLabel} のプレイ結果を記録します。`}
        <br />
        このまま進めてもよろしいですか？
      </>
    );
  }, [resultId, isSave, gameModeLabel]);

  const onClose = useCallback(() => {
    d(
      store.appStateMutate(state => {
        state.isOpenResult = false;
      })
    );
  }, [d]);
  const onClickNewGameWithSave = useCallback(() => {
    if (isRatingLocked) {
      return;
    }
    setOpenNewGame(true);
    setIsSave(true);
  }, [isRatingLocked]);
  const onClickNewGameWithNoSave = useCallback(() => {
    setOpenNewGame(true);
    setIsSave(false);
  }, []);
  const onCloseNewGame = useCallback(() => {
    setOpenNewGame(false);
  }, []);
  const onClickOkNewGame = useCallback(async () => {
    setOpenNewGame(false);
    const sanitizedResults = sortedResult.map(player => ({
      ...player,
      ratingBefore:
        player.ratingBefore !== undefined ? player.ratingBefore : null,
      ratingAfter: player.ratingAfter !== undefined ? player.ratingAfter : null
    }));
    if (isSave && sortedResult.length > 0) {
      if (resultId !== null) {
        const success = await d(
          store.updateResult(
            resultId,
            {
              playedAt: resultDate,
              results: sanitizedResults,
              gameMode
            },
            { skipConfirm: true }
          )
        );
        if (!success) {
          return;
        }
      } else {
        const success = await d(
          store.addResult({
            playedAt: resultDate,
            results: sanitizedResults,
            gameMode
          })
        );
        if (!success) {
          return;
        }
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

  const summaryState = useSelector(store.getUserStatsSummaryState);
  const previewParticipants = useMemo(
    () => sortedResult.filter(result => result.uid && result.uid !== -1),
    [sortedResult]
  );

  useEffect(() => {
    if (!open || resultId !== null) {
      setRatingPreview({});
      return;
    }

    const seen = new Set();
    previewParticipants.forEach(participant => {
      if (
        !participant.uid ||
        participant.uid === -1 ||
        seen.has(participant.uid)
      ) {
        return;
      }
      seen.add(participant.uid);
      const summary = summaryState[participant.uid];
      const modeSummary = summary?.modes?.[gameMode];
      if (!summary || !modeSummary) {
        d(
          store.fetchUserStatsSummaryById(participant.uid, {
            modes: [gameMode]
          })
        );
      }
    });
  }, [open, resultId, gameMode, previewParticipants, summaryState, d]);

  useEffect(() => {
    if (!open || resultId !== null) {
      setRatingPreview({});
      return;
    }

    const seen = new Set();
    const uniqueParticipants = previewParticipants.filter(participant => {
      if (!participant.uid || participant.uid === -1) {
        return false;
      }
      if (seen.has(participant.uid)) {
        return false;
      }
      seen.add(participant.uid);
      return true;
    });

    if (uniqueParticipants.length === 0) {
      setRatingPreview({});
      return;
    }

    const stateLookup = new Map();
    uniqueParticipants.forEach(participant => {
      const summary = summaryState[participant.uid];
      const modeSummary = summary?.modes?.[gameMode];
      stateLookup.set(participant.uid, createStateFromSummary(modeSummary));
    });

    if (uniqueParticipants.length < 2) {
      const preview = {};
      uniqueParticipants.forEach(participant => {
        const state = stateLookup.get(participant.uid) || createPreviewState();
        const conservative = previewConservativeRating(state.mu, state.sigma);
        preview[participant.uid] = {
          ratingBefore: toEloRating(conservative),
          ratingAfter: toEloRating(conservative)
        };
      });
      setRatingPreview(preview);
      return;
    }

    const entries = buildPreviewEntries(uniqueParticipants, gameMode);
    const { outcomes } = previewRateMatch(entries, stateLookup);
    const preview = {};
    entries.forEach(entry => {
      const state = stateLookup.get(entry.uid) || createPreviewState();
      const outcome = outcomes.get(entry.uid);
      const beforeValue = outcome
        ? outcome.ratingBefore
        : previewConservativeRating(state.mu, state.sigma);
      const afterValue = outcome
        ? outcome.ratingAfter
        : previewConservativeRating(state.mu, state.sigma);
      preview[entry.uid] = {
        ratingBefore: toEloRating(beforeValue),
        ratingAfter: toEloRating(afterValue)
      };
    });
    setRatingPreview(preview);
  }, [open, resultId, gameMode, previewParticipants, summaryState]);

  const isNewResult = resultId === null;

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
          <ResultListItem
            key={result.uid}
            {...result}
            ratingBefore={
              isNewResult
                ? ratingPreview[result.uid]?.ratingBefore ??
                  (typeof result.ratingBefore === "number"
                    ? toEloRating(result.ratingBefore)
                    : null)
                : null
            }
            ratingAfter={
              isNewResult
                ? ratingPreview[result.uid]?.ratingAfter ??
                  (typeof result.ratingAfter === "number"
                    ? toEloRating(result.ratingAfter)
                    : null)
                : null
            }
          />
        ))}
        <ListItem>
          <Button
            color="primary"
            onClick={onClickNewGameWithSave}
            fullWidth
            variant="contained"
            disabled={isRatingLocked}
          >
            {saveButtonLabel}
            <SaveIcon className={classes.rightIcon} />
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
        {resultId !== null ? (
          <ListItem>
            <Button
              color="secondary"
              onClick={onClickNewGameWithNoSave}
              fullWidth
              variant="outlined"
            >
              {discardButtonLabel}
            </Button>
          </ListItem>
        ) : null}
      </List>
      <AlertDialog
        title={dialogTitle}
        isOpen={openNewGame}
        onClose={onCloseNewGame}
        onClickOk={onClickOkNewGame}
        disableRestoreFocus={false}
      >
        <Typography variant="body2">{dialogBody}</Typography>
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
