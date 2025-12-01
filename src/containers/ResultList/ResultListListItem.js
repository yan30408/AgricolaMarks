import React, { memo, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@mui/styles";
import {
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography
} from "@mui/material";
import Avatar from "@mui/material/Avatar";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardIos";

import { format } from "date-fns";
import { GameModes, DEFAULT_GAME_MODE } from "Constants";

const TOP_PLAYER_COLOR = "#1976d2";

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

const useStyles = makeStyles({
  spacer: {
    flexGrow: 1
  },
  arrowForward: {
    minWidth: 0
  },
  avatarStack: {
    display: "flex",
    alignItems: "center",
    marginRight: 8
  },
  topAvatar: {
    width: 32,
    height: 32,
    fontSize: "0.9rem",
    border: "2px solid #fff",
    boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.08)",
    "&:not(:first-of-type)": {
      marginLeft: -10
    }
  },
  gameModeLabel: {
    marginLeft: 8,
    fontSize: "0.85rem",
    color: "rgba(0, 0, 0, 0.54)"
  }
});

const PlayerName = props => {
  const user = useSelector(state => store.getUserById(state, props.uid));
  const displayName = user?.displayName || props.fallbackName || "Anonymous";
  const isTopPlayer = Boolean(props.isTop);
  return (
    <>
      {props.index !== 0 ? ", " : ""}
      <span
        style={
          isTopPlayer ? { fontWeight: 700, color: TOP_PLAYER_COLOR } : undefined
        }
      >
        {displayName}
      </span>
    </>
  );
};

const TopPlayerAvatar = memo(props => {
  const user = useSelector(state => store.getUserById(state, props.uid));
  const displayName = user?.displayName || props.fallbackName || "Anonymous";
  const photoUrl =
    user?.photoUrl || user?.iconUrl || props.fallbackPhotoUrl || null;

  return (
    <Avatar src={photoUrl} alt={displayName} className={props.className}>
      {displayName?.substr(0, 1) || "?"}
    </Avatar>
  );
});

const ResultListListItem = props => {
  const classes = useStyles();

  const result = useSelector(state =>
    store.getResultById(state, props.resultId)
  );
  const { participants, topScore, topParticipants } = useMemo(() => {
    const list = Array.isArray(result?.results) ? result.results : [];
    if (list.length === 0) {
      return { participants: [], topScore: null, topParticipants: [] };
    }
    const highest = list.reduce((max, entry) => {
      const score = entry?.score?.total;
      if (typeof score !== "number") {
        return max;
      }
      return score > max ? score : max;
    }, Number.NEGATIVE_INFINITY);
    if (!Number.isFinite(highest)) {
      return { participants: list, topScore: null, topParticipants: [] };
    }
    const topEntries = list.filter(entry => {
      const score = entry?.score?.total;
      return typeof score === "number" && score === highest;
    });
    const uniqueTop = [];
    const seen = new Set();
    topEntries.forEach(entry => {
      const uid = entry?.uid;
      if (uid) {
        if (seen.has(uid)) {
          return;
        }
        seen.add(uid);
      }
      uniqueTop.push(entry);
    });
    return {
      participants: list,
      topScore: highest,
      topParticipants: uniqueTop
    };
  }, [result]);

  const onSelect = useCallback(() => {
    props.onSelect(props.resultId);
  }, [props.onSelect, props.resultId]);
  if (!result) return null;
  const playedAtDate = toDate(result.playedAt || result.date);
  const time = playedAtDate ? format(playedAtDate, "HH:mm") : "";
  const gameMode = result.gameMode || DEFAULT_GAME_MODE;
  const gameModeLabel = GameModes[gameMode]?.label || gameMode;

  return (
    <>
      <ListItem button onClick={onSelect} divider>
        <ListItemText
          primary={
            <Typography noWrap>
              {time}
              {gameModeLabel ? (
                <span className={classes.gameModeLabel}>{gameModeLabel}</span>
              ) : null}
            </Typography>
          }
          secondary={
            <Typography
              noWrap
              display="block"
              variant="caption"
              color="textSecondary"
            >
              {participants.map((player, index) => {
                const key = player.uid || index;
                return (
                  <PlayerName
                    key={`player-${key}`}
                    uid={player.uid}
                    index={index}
                    isTop={
                      topScore !== null &&
                      typeof player?.score?.total === "number" &&
                      player.score.total === topScore
                    }
                    fallbackName={player.displayName || player.name}
                  />
                );
              })}
            </Typography>
          }
        />
        <div className={classes.spacer} />
        {topParticipants.length > 0 ? (
          <div className={classes.avatarStack}>
            {topParticipants.map((player, index) => {
              const key = player.uid || index;
              return (
                <TopPlayerAvatar
                  key={`top-player-${key}`}
                  uid={player.uid}
                  className={classes.topAvatar}
                  fallbackName={player.displayName || player.name}
                  fallbackPhotoUrl={player.photoUrl || player.iconUrl}
                />
              );
            })}
          </div>
        ) : null}
        <ListItemIcon className={classes.arrowForward}>
          <ArrowForwardIcon />
        </ListItemIcon>
      </ListItem>
    </>
  );
};

export default memo(ResultListListItem);
