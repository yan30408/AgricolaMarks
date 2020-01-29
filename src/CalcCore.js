import React from "react";
import { withStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import AppBar from "@material-ui/core/AppBar";
import Typography from "@material-ui/core/Typography";
import MenuItem from "@material-ui/core/MenuItem";
import TextField from "@material-ui/core/TextField";
import { ScoreByRoomType } from "./Constants";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
import Tooltip from "@material-ui/core/Tooltip";

const styles = {
  root: {
    flexGrow: 1
  },
  container: {
    display: "flex",
    flexWrap: "wrap"
  }
};

const imageUrl = {
  Fields:
    "https://uploads.codesandbox.io/uploads/user/42f1ba5d-a9d8-4e15-8204-739a96ca5333/7qda-Fields.png",
  Pastures:
    "https://uploads.codesandbox.io/uploads/user/42f1ba5d-a9d8-4e15-8204-739a96ca5333/tT1E-Fence.png",
  Grain:
    "https://uploads.codesandbox.io/uploads/user/42f1ba5d-a9d8-4e15-8204-739a96ca5333/-HbW-Grain.png",
  Vegetables:
    "https://uploads.codesandbox.io/uploads/user/42f1ba5d-a9d8-4e15-8204-739a96ca5333/J-M0-Vege.png",
  Sheep:
    "https://uploads.codesandbox.io/uploads/user/42f1ba5d-a9d8-4e15-8204-739a96ca5333/y_tW-Sheep.png",
  "Wild boar":
    "https://uploads.codesandbox.io/uploads/user/42f1ba5d-a9d8-4e15-8204-739a96ca5333/zvjv-Boar.png",
  Cattle:
    "https://uploads.codesandbox.io/uploads/user/42f1ba5d-a9d8-4e15-8204-739a96ca5333/XmUo-Cattle.png",
  "Unused Spaces":
    "https://uploads.codesandbox.io/uploads/user/42f1ba5d-a9d8-4e15-8204-739a96ca5333/HKJ9-Space.png",
  Stable:
    "https://uploads.codesandbox.io/uploads/user/42f1ba5d-a9d8-4e15-8204-739a96ca5333/XIMf-Stable.png",
  Rooms_Wood:
    "https://uploads.codesandbox.io/uploads/user/42f1ba5d-a9d8-4e15-8204-739a96ca5333/ehx--Room_Wood.png",
  Rooms_Clay:
    "https://uploads.codesandbox.io/uploads/user/42f1ba5d-a9d8-4e15-8204-739a96ca5333/IH1K-Room_Clay.png",
  Rooms_Stone:
    "https://uploads.codesandbox.io/uploads/user/42f1ba5d-a9d8-4e15-8204-739a96ca5333/nl26-Room_Stone.png",
  Family:
    "https://uploads.codesandbox.io/uploads/user/42f1ba5d-a9d8-4e15-8204-739a96ca5333/1O4_-Family.png",
  Beggar:
    "https://uploads.codesandbox.io/uploads/user/42f1ba5d-a9d8-4e15-8204-739a96ca5333/TRwp-Beggar.png",
  Improvement:
    "https://uploads.codesandbox.io/uploads/user/42f1ba5d-a9d8-4e15-8204-739a96ca5333/XSyE-Improvement.png",
  Bonus:
    "https://uploads.codesandbox.io/uploads/user/42f1ba5d-a9d8-4e15-8204-739a96ca5333/ODvF-Bonus.png"
};

class CalcPlayer extends React.Component {
  render5Buttons(id, btn0, btn1, btn2, btn3, btn4) {
    const { category } = this.props.playerResult;
    return (
      <Calc5Buttons
        id={id}
        value={category[id].value}
        onChange={(event, value) => this.props.onChange5btn(event, value, id)}
        btn0={btn0}
        btn1={btn1}
        btn2={btn2}
        btn3={btn3}
        btn4={btn4}
        disabled={this.props.playerResult.id == -1}
      />
    );
  }

  renderButtons(id, beginIndex, endIndex, point, suffix = "") {
    const { category } = this.props.playerResult;
    console.log(suffix);
    return (
      <CalcButtons
        id={id + suffix}
        value={category[id].value}
        onChange={(event, value) =>
          this.props.onChangeBtn(event, value, id, point, beginIndex)
        }
        beginIndex={beginIndex}
        endIndex={endIndex}
        disabled={this.props.playerResult.id == -1}
      />
    );
  }

  getHelperText(playerNum) {
    if (playerNum == 0) {
      return "Please set up from the menu in the upper left";
    }
    if (this.props.playerResult.id == -1) {
      return "Please Select Player";
    }
    return "";
  }

  render() {
    const { classes } = this.props;
    const { category } = this.props.playerResult;
    let playersInfo = this.props.playersInfo.filter((value, index) => {
      return (
        value.name != null &&
        (value.order === null || value.id === this.props.playerResult.id)
      );
    });
    return (
      <div>
        <form className={classes.container} noValidate autoComplete="off">
          <TextField
            id="outlined-select-color"
            select
            label="Player"
            value={this.props.playerResult.id}
            onChange={this.props.onChangePlayer}
            margin="normal"
            variant="outlined"
            helperText={this.getHelperText(Object.keys(playersInfo).length)}
            error={this.props.playerResult.id == -1}
            fullWidth
          >
            {playersInfo.map((value, index) => (
              <MenuItem
                value={value.id}
                style={{
                  color: value.color.main,
                  backgroundColor: value.color.sub
                }}
              >
                {value.name}
              </MenuItem>
            ))}
            <MenuItem value={-1}>
              <em>None</em>
            </MenuItem>
          </TextField>
        </form>
        <Grid container spacing={8}>
          {this.render5Buttons("Fields", "0-1", "2", "3", "4", "5+")}
          {this.render5Buttons("Pastures", "0", "1", "2", "3", "4+")}
          {this.render5Buttons("Grain", "0", "1-3", "4-5", "6-7", "8+")}
          {this.render5Buttons("Vegetables", "0", "1", "2", "3", "4+")}
          {this.render5Buttons("Sheep", "0", "1-3", "4-5", "6-7", "8+")}
          {this.render5Buttons("Wild boar", "0", "1-2", "3-4", "5-6", "7+")}
          {this.render5Buttons("Cattle", "0", "1", "2-3", "4-5", "6+")}
          {this.renderButtons("Stable", 0, 4, 1)}
          {this.renderButtons("Unused Spaces", 0, 13, -1)}
          <Grid container spacing={0} alignItems="flex-end">
            <Grid item xs={2} />
            <Grid item xs={10}>
              <RadioGroup
                aria-label="ScoreByRoomType"
                name="ScoreByRoomType"
                value={category["Rooms"].type}
                onChange={this.props.onChangeRoomType}
                row
              >
                {Object.keys(ScoreByRoomType).map(value => (
                  <FormControlLabel
                    value={value}
                    control={<Radio />}
                    label={value}
                    disabled={this.props.playerResult.id == -1}
                    labelPlacement="bottom"
                  />
                ))}
              </RadioGroup>
            </Grid>
          </Grid>
          {this.renderButtons(
            "Rooms",
            2,
            15,
            ScoreByRoomType[category["Rooms"].type],
            "_" + category["Rooms"].type
          )}
          {this.renderButtons("Family", 2, 5, 3)}
          {this.renderButtons("Improvement", 0, 30, 1)}
          {this.renderButtons("Bonus", -10, 50, 1)}
          {this.renderButtons("Beggar", 0, 10, -3)}
        </Grid>
        <AppBar
          position="fixed"
          color="default"
          style={{ top: "auto", bottom: 0 }}
        >
          <Typography variant="h5" color="inherit" align="Center">
            Score : {this.props.playerResult.score.total}
          </Typography>
        </AppBar>
      </div>
    );
  }
}

function Calc5Buttons(props) {
  return (
    <Grid container spacing={8} alignItems="center" item>
      <Hidden xsDown>
        <Grid item sm={2}>
          {props.id}
        </Grid>
      </Hidden>
      <Grid item xs={2} sm={2} justify="space-around" container>
        <Tooltip title={props.id}>
          <img src={imageUrl[props.id]} width={42} height={42} />
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
            centered
          >
            {[props.btn0, props.btn1, props.btn2, props.btn3, props.btn4].map(
              value => (
                <Tab
                  label={value}
                  disabled={props.disabled}
                  style={{ minWidth: "20%" }}
                />
              )
            )}
          </Tabs>
        </Paper>
      </Grid>
    </Grid>
  );
}

function CalcButtons(props) {
  return (
    <Grid container spacing={8} alignItems="center" item>
      <Hidden xsDown>
        <Grid item sm={2}>
          {props.id}
        </Grid>
      </Hidden>
      <Grid item xs={2} sm={2} justify="space-around" container>
        <img src={imageUrl[props.id]} width={42} height={42} />
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
              .map((value, index) => (
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
}

export default withStyles(styles)(CalcPlayer);
