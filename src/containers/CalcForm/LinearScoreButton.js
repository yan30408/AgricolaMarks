import React, { memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { Paper, Tabs, Tab, Grid, Hidden, Tooltip } from "@material-ui/core";
import { imageUrl } from "./data";

const LinearScoreButton = props => {
  const d = useDispatch();
  const order = useSelector(state => store.getAppState(state, "currentOrder"));
  const result = useSelector(state => store.getAppResultByIndex(state, order));
  const length = props.endIndex - props.beginIndex + 1;

  const onChange = useCallback(
    (_, value) => {
      d(
        store.appResultsChangeLinearScoreButton(
          order,
          props.id,
          value,
          props.point
        )
      );
    },
    [d, order, props.id, props.point]
  );

  return (
    <Grid container spacing={0} alignItems="center" item>
      <Hidden xsDown>
        <Grid item sm={2}>
          {props.label}
        </Grid>
      </Hidden>
      <Grid item xs={2} sm={2} justify="space-around" container>
        <Tooltip title={props.label}>
          <img
            src={imageUrl[props.label]}
            width={42}
            height={42}
            alt={props.label}
          />
        </Tooltip>
      </Grid>
      <Grid item xs={10} sm={8}>
        <Paper>
          <Tabs
            value={result.category[props.id].value}
            onChange={onChange}
            indicatorColor="secondary"
            textColor="secondary"
            variant={length > 5 ? "scrollable" : "fullWidth"}
            scrollButtons="auto"
          >
            {Array(length)
              .fill(0)
              .map((_, index) => {
                const label = index + props.beginIndex;
                return (
                  <Tab
                    key={label}
                    value={label}
                    label={label}
                    disabled={props.disabled}
                    style={{ minWidth: "20%" }}
                  />
                );
              })}
          </Tabs>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default memo(LinearScoreButton);
