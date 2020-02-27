import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { Paper, Tabs, Tab, Grid, Hidden, Tooltip } from "@material-ui/core";

const styles = {
  root: {
    flexGrow: 1
  },
  container: {
    display: "flex",
    flexWrap: "wrap"
  }
};

const ScoreButtonLinear = props => {
  return (
    <Grid container spacing={8} alignItems="center" item>
      <Hidden xsDown>
        <Grid item sm={2}>
          {props.categoryName}
        </Grid>
      </Hidden>
      <Grid item xs={2} sm={2} justify="space-around" container>
        <Tooltip title={props.categoryName}>
          <img src={props.imageUrl} width={42} height={42} />
        </Tooltip>
      </Grid>
      <Grid item xs={10} sm={8}>
        <Paper>
          <Tabs
            value={props.value}
            onChange={props.onChange}
            indicatorColor="secondary"
            textColor="secondary"
            fullWidth
            scrollable={props.endIndex - props.beginIndex > 5 ? true : false}
            scrollButtons="auto"
          >
            {Array(props.endIndex - props.beginIndex + 1)
              .fill(0)
              .map((_, index) => (
                <Tab
                  key={index}
                  label={index + props.beginIndex}
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

export default withStyles(styles)(ScoreButtonLinear);
