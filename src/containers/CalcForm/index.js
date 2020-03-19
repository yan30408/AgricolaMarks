import React, { memo, useCallback, useMemo, Fragment, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { makeStyles } from "@material-ui/core/styles";
import { MenuItem, TextField, Grid } from "@material-ui/core";
import rsScroller from "react-smooth-scroller";

import { ScoreByRoomType } from "Constants";
import { fixedButtonData, linearButtonData } from "./data";
import FixedScoreButton from "./FixedScoreButton";
import LinearScoreButton from "./LinearScoreButton";
import RoomTypeRadioButton from "./RoomTypeRadioButton";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexWrap: "wrap"
  }
});

const CalcForm = props => {
  const classes = useStyles();
  const d = useDispatch();
  const validPlayers = useSelector(state => store.getValidPlayers(state));
  const playerId = useSelector(state =>
    store.getAppState(state, "currentPlayerId")
  );
  const order = useSelector(state => store.getAppState(state, "currentOrder"));
  const result = useSelector(state => store.getAppResultByIndex(state, order));
  const playerColor = useSelector(state =>
    store.getAppCurrentPlayerById(state, playerId)
  )?.color.sub;
  const isInvalidPlayer = playerId === -1;

  const onChangePlayer = useCallback(
    event => {
      const selectedId = event.target.value;
      d(
        store.appPlayersMutate(players => {
          if (playerId >= 0) {
            players.current[playerId].order = null;
          }
          if (selectedId >= 0) {
            players.current[selectedId].order = order;
          }
        })
      );
      d(
        store.appResultsMutate(results => {
          results[order].id = selectedId;
        })
      );
      d(
        store.appStateMutate(state => {
          state.currentPlayerId = selectedId;
        })
      );
    },
    [d, playerId, order]
  );
  const getHelperText = useMemo(() => {
    if (validPlayers.length === 0) {
      return "Please set up from the menu in the upper left";
    }
    if (isInvalidPlayer) {
      return "Please Select Player";
    }
    return "";
  }, [validPlayers.length, isInvalidPlayer]);

  useEffect(() => {
    rsScroller.scrollToTop({ duration: 500 });
    // ボーナスの表示だけ左合わせにできなかったのでウンチみたいな処理
    if (result.id === -1) {
      d(
        store.appResultsMutate(results => {
          results[order].category["Bonus"].value = 20;
        })
      );
      setTimeout(() => {
        d(
          store.appResultsMutate(results => {
            results[order].category["Bonus"].value = 0;
          })
        );
      }, 500);
    }
  }, [d, order, result.id]);

  return (
    <div style={{ backgroundColor: playerColor, padding: "50px 10px" }}>
      <form className={classes.container} noValidate autoComplete="off">
        <TextField
          id="outlined-select-color"
          select
          label="Player"
          value={playerId}
          onChange={onChangePlayer}
          margin="normal"
          variant="outlined"
          helperText={getHelperText}
          error={isInvalidPlayer}
          fullWidth
        >
          {validPlayers
            .filter(player => player.order === null || player.order === order)
            .map(player => (
              <MenuItem
                key={player.id.toString()}
                value={player.id}
                style={{
                  color: player.color.main,
                  backgroundColor: player.color.sub
                }}
              >
                {player.name}
              </MenuItem>
            ))}
          <MenuItem key="-1" value={-1}>
            <em>None</em>
          </MenuItem>
        </TextField>
      </form>
      <Grid container spacing={1}>
        {fixedButtonData.map(data => (
          <FixedScoreButton
            key={data.id}
            {...data}
            label={data.id}
            disabled={isInvalidPlayer}
          />
        ))}
        {linearButtonData.map(data => {
          return (
            <Fragment key={data.id}>
              {data.id === "Rooms" ? (
                <>
                  <RoomTypeRadioButton disabled={isInvalidPlayer} />
                  <LinearScoreButton
                    {...data}
                    label={`${result.category["Rooms"].type} ${data.id}`}
                    point={ScoreByRoomType[result.category["Rooms"].type]}
                    disabled={isInvalidPlayer}
                  />
                </>
              ) : (
                <LinearScoreButton
                  {...data}
                  label={data.id}
                  disabled={isInvalidPlayer}
                />
              )}
            </Fragment>
          );
        })}
      </Grid>
    </div>
  );
};

export default memo(CalcForm);
