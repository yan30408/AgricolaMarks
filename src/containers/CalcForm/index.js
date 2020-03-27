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
  const order = useSelector(state => store.getAppState(state, "currentOrder"));
  const result = useSelector(state => store.getAppResultByIndex(state, order));
  const playerColor = useSelector(state =>
    store.getAppCurrentPlayerById(state, result.uid)
  )?.color.sub;
  const isInvalidPlayer = result.uid !== -1;

  const onChangePlayer = useCallback(
    event => {
      const selectedId = event.target.value;
      d(
        store.appResultsMutate(results => {
          results[order].uid = selectedId;
        })
      );
    },
    [d, order]
  );
  const getHelperText = useMemo(() => {
    if (validPlayers.length === 0) {
      return "左上のメニューより、参加プレイヤー設定を行ってください";
    }
    if (isInvalidPlayer) {
      return "手番プレイヤーを選択してください";
    }
    return "";
  }, [validPlayers.length, isInvalidPlayer]);

  useEffect(() => {
    rsScroller.scrollToTop({ duration: 500 });
    // ボーナスの表示だけ左合わせにできなかったのでウンチみたいな処理
    if (result.uid === -1) {
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
  }, [d, order, result.uid]);

  return (
    <div style={{ backgroundColor: playerColor, padding: "50px 10px" }}>
      <form className={classes.container} noValidate autoComplete="off">
        <TextField
          select
          label="Player"
          value={result.uid}
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
                key={player.uid}
                value={player.uid}
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
