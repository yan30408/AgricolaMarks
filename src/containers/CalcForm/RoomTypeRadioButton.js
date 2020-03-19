import React, { memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { Radio, RadioGroup, FormControlLabel, Grid } from "@material-ui/core";

import { ScoreByRoomType } from "Constants";

const RoomTypeRadioButton = props => {
  const d = useDispatch();
  const order = useSelector(state => store.getAppState(state, "currentOrder"));
  const result = useSelector(state => store.getAppResultByIndex(state, order));
  const onChange = useCallback(
    event => {
      d(store.appResultsChangeRoom(order, event.target.value));
    },
    [d, order]
  );

  return (
    <Grid container spacing={0} alignItems="flex-end">
      <Grid item xs={2} sm={4} />
      <Grid item xs={10} sm={8}>
        <RadioGroup
          name="ScoreByRoomType"
          value={result.category["Rooms"].type}
          onChange={onChange}
          row
        >
          {Object.keys(ScoreByRoomType).map(value => (
            <FormControlLabel
              key={value}
              value={value}
              control={<Radio />}
              label={value}
              disabled={props.disabled}
              labelPlacement="bottom"
            />
          ))}
        </RadioGroup>
      </Grid>
    </Grid>
  );
};

export default memo(RoomTypeRadioButton);
