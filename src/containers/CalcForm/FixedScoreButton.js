import React, { memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { Paper, Tabs, Tab, Grid, Hidden, Tooltip } from "@material-ui/core";
import { imageUrl } from "./data";

const FixedScoreButton = props => {
  const d = useDispatch();
  const order = useSelector(state => store.getAppState(state, "currentOrder"));
  const result = useSelector(state => store.getAppResultByIndex(state, order));

  const onChange = useCallback(
    (_, value) => {
      d(store.appResultsChangeFixedScoreButton(order, props.id, value));
    },
    [d, order, props.id]
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
            src={imageUrl[props.id]}
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
            variant="fullWidth"
            centered
          >
            {props.labels.map(label => (
              <Tab
                key={label}
                label={label}
                disabled={props.disabled}
                style={{ minWidth: "20%" }}
              />
            ))}
          </Tabs>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default memo(FixedScoreButton);
