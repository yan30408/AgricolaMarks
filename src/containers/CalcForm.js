import React from "react";
import { withStyles } from "@material-ui/core/styles";
import {
  Radio,
  RadioGroup,
  AppBar,
  Typography,
  MenuItem,
  TextField,
  FormControlLabel,
  Grid,
  LinearProgress
} from "@material-ui/core";
import { ScoreByRoomType } from "../Constants";
import ScoreButtonFixed from "../components/ScoreButtonFixed";
import ScoreButtonLinear from "../components/ScoreButtonLinear";

const styles = {
  root: {
    flexGrow: 1
  },
  container: {
    display: "flex",
    flexWrap: "wrap"
  }
};

const CalcForm = props => {
  const imageUrl = {
    Fields: `${process.env.PUBLIC_URL}/images/Fields.png`,
    Pastures: `${process.env.PUBLIC_URL}/images/Fence.png`,
    Grain: `${process.env.PUBLIC_URL}/images/Grain.png`,
    Vegetables: `${process.env.PUBLIC_URL}/images/Vege.png`,
    Sheep: `${process.env.PUBLIC_URL}/images/Sheep.png`,
    "Wild boar": `${process.env.PUBLIC_URL}/images/Boar.png`,
    Cattle: `${process.env.PUBLIC_URL}/images/Cattle.png`,
    "Unused Spaces": `${process.env.PUBLIC_URL}/images/Space.png`,
    Stable: `${process.env.PUBLIC_URL}/images/Stable.png`,
    Rooms_Wood: `${process.env.PUBLIC_URL}/images/Room_Wood.png`,
    Rooms_Clay: `${process.env.PUBLIC_URL}/images/Room_Clay.png`,
    Rooms_Stone: `${process.env.PUBLIC_URL}/images/Room_Stone.png`,
    Family: `${process.env.PUBLIC_URL}/images/Family.png`,
    Beggar: `${process.env.PUBLIC_URL}/images/Beggar.png`,
    Improvement: `${process.env.PUBLIC_URL}/images/Improvement.png`,
    Bonus: `${process.env.PUBLIC_URL}/images/Bonus.png`
  };
  const fixedButtonData = [
    {
      id: "Fields",
      labels: ["0-1", "2", "3", "4", "5+"]
    },
    {
      id: "Pastures",
      labels: ["0", "1", "2", "3", "4+"]
    },
    {
      id: "Grain",
      labels: ["0", "1-3", "4-5", "6-7", "8+"]
    },
    {
      id: "Vegetables",
      labels: ["0", "1", "2", "3", "4+"]
    },
    {
      id: "Sheep",
      labels: ["0", "1-3", "4-5", "6-7", "8+"]
    },
    {
      id: "Wild boar",
      labels: ["0", "1-2", "3-4", "5-6", "7+"]
    },
    {
      id: "Cattle",
      labels: ["0", "1", "2-3", "4-5", "6+"]
    }
  ];
  const linearButtonData = [
    {
      id: "Stable",
      beginIndex: 0,
      endIndex: 4,
      point: 1
    },
    {
      id: "Unused Spaces",
      beginIndex: 0,
      endIndex: 13,
      point: -1
    },
    {
      id: "Rooms",
      beginIndex: 2,
      endIndex: 15
    },
    {
      id: "Family",
      beginIndex: 2,
      endIndex: 5,
      point: 3
    },
    {
      id: "Improvement",
      beginIndex: 0,
      endIndex: 30,
      point: 1
    },
    {
      id: "Bonus",
      beginIndex: -10,
      endIndex: 50,
      point: 1
    },
    {
      id: "Beggar",
      beginIndex: 0,
      endIndex: 10,
      point: -3
    }
  ];
  const { classes } = props;
  const { category } = props.playerResult;
  const isInvalidPlayer = props.playerResult.id === -1;

  const getHelperText = playerNum => {
    if (playerNum === 0) {
      return "Please set up from the menu in the upper left";
    }
    if (isInvalidPlayer) {
      return "Please Select Player";
    }
    return "";
  };

  let playersInfo = props.playersInfo.filter((value, index) => {
    return (
      value.name !== null &&
      (value.order === null || value.id === props.playerResult.id)
    );
  });

  return (
    <div>
      <form className={classes.container} noValidate autoComplete="off">
        <TextField
          id="outlined-select-color"
          select
          label="Player"
          value={props.playerResult.id}
          onChange={props.onChangePlayer}
          margin="normal"
          variant="outlined"
          helperText={getHelperText(Object.keys(playersInfo).length)}
          error={isInvalidPlayer}
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
        {fixedButtonData.map(data => (
          <ScoreButtonFixed
            categoryName={data.id}
            labels={data.labels}
            imageUrl={imageUrl[data.id]}
            value={category[data.id].value}
            onChange={(event, value) =>
              props.onChange5btn(event, value, data.id)
            }
            disabled={isInvalidPlayer}
          />
        ))}
        {linearButtonData.map(data => {
          const isRoom = data.id === "Rooms";
          const categoryName = isRoom
            ? `${data.id}_${category[data.id].type}`
            : data.id;
          const point = isRoom
            ? ScoreByRoomType[category["Rooms"].type]
            : data.point;
          return (
            <>
              {isRoom ? (
                <Grid container spacing={0} alignItems="flex-end">
                  <Grid item xs={2} />
                  <Grid item xs={10}>
                    <RadioGroup
                      aria-label="ScoreByRoomType"
                      name="ScoreByRoomType"
                      value={category["Rooms"].type}
                      onChange={props.onChangeRoomType}
                      row
                    >
                      {Object.keys(ScoreByRoomType).map(value => (
                        <FormControlLabel
                          value={value}
                          control={<Radio />}
                          label={value}
                          disabled={isInvalidPlayer}
                          labelPlacement="bottom"
                        />
                      ))}
                    </RadioGroup>
                  </Grid>
                </Grid>
              ) : null}
              <ScoreButtonLinear
                categoryName={categoryName}
                imageUrl={imageUrl[categoryName]}
                value={category[data.id].value}
                onChange={(event, value) =>
                  props.onChangeBtn(
                    event,
                    value,
                    data.id,
                    point,
                    data.beginIndex
                  )
                }
                beginIndex={data.beginIndex}
                endIndex={data.endIndex}
                disabled={isInvalidPlayer}
              />
            </>
          );
        })}
      </Grid>
      <AppBar
        position="fixed"
        color="default"
        style={{ top: "auto", bottom: 0 }}
      >
        <Typography variant="h5" color="inherit" align="Center">
          Score : {props.playerResult.score.total}
        </Typography>
      </AppBar>
    </div>
  );
};

export default withStyles(styles)(CalcForm);
