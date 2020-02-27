import React from "react";
import store from "store";
import { withStyles } from "@material-ui/core/styles";
import {
  IconButton,
  List,
  ListItem,
  Dialog,
  Toolbar,
  AppBar,
  Typography,
  Divider,
  TextField,
  Slide,
  Menu,
  MenuItem,
  InputAdornment
} from "@material-ui/core";

import CloseIcon from "@material-ui/icons/Close";
import PlayersIcon from "@material-ui/icons/FolderShared";

import { Colors } from "../Constants";

const styles = theme => ({
  appBar: {
    position: "relative"
  },
  flex: {
    flex: 1
  },
  container: {
    display: "flex",
    flexWrap: "wrap",
    padding: "60px 0px"
  },
  textField: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit
  },
  menu: {
    width: 50
  }
});

const ITEM_HEIGHT = 48;
let RecentPlayers = store.get("RecentPlayers") || [];

function Transition(props) {
  return <Slide direction="down" {...props} />;
}

class FullScreenDialog extends React.Component {
  state = {
    anchorEl: null,
    playerIndex: 0
  };

  onClickAddRecentPlayers = index => event => {
    if (RecentPlayers.length > 0) {
      this.setState({
        anchorEl: event.currentTarget,
        playerIndex: index
      });
    }
  };

  onClickName = (event, index) => {
    this.setState({ anchorEl: null });
    const evt = { target: { value: RecentPlayers[index] } };
    this.props.onChangeName(evt, this.state.playerIndex);
  };

  onClose = () => {
    let distinctPlayers = new Array(0);
    this.props.playersInfo.forEach(value => {
      if (
        value.name !== null &&
        value.name !== "" &&
        distinctPlayers.indexOf(value.name) === -1
      ) {
        distinctPlayers.push(value.name);
      }
    });

    RecentPlayers.reduce((distinct, player) => {
      if (distinct.indexOf(player) === -1) {
        distinct.push(player);
      }

      return distinct;
    }, distinctPlayers);

    // とりえあず最大20件
    const recPlayers = distinctPlayers.slice(0, 20);
    store.set("RecentPlayers", recPlayers);
    RecentPlayers = recPlayers;
    this.props.onClose();
  };

  render() {
    const { classes } = this.props;
    const { anchorEl } = this.state;
    const open = Boolean(anchorEl);

    return (
      <div>
        <Dialog
          fullScreen
          open={this.props.isOpen}
          onClose={this.onClose}
          TransitionComponent={Transition}
        >
          <AppBar className={classes.appBar}>
            <Toolbar>
              <IconButton
                color="inherit"
                onClick={this.onClose}
                aria-label="Close"
              >
                <CloseIcon />
              </IconButton>
              <Typography variant="h6" color="inherit" className={classes.flex}>
                Setup Player Info
              </Typography>
            </Toolbar>
          </AppBar>
          <List>
            {[0, 1, 2, 3, 4].map(index => (
              <div
                key={index}
                style={{
                  backgroundColor: this.props.playersInfo[index].color.sub
                }}
              >
                <ListItem Item>
                  <TextField
                    id="outlined-name"
                    label="Name"
                    className={classes.textField}
                    value={this.props.playersInfo[index].name}
                    onChange={event => this.props.onChangeName(event, index)}
                    margin="normal"
                    variant="outlined"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={this.onClickAddRecentPlayers(index)}
                          >
                            <PlayersIcon />
                          </IconButton>
                          <Menu
                            anchorEl={anchorEl}
                            open={open}
                            onClose={() => {
                              this.setState({ anchorEl: null });
                            }}
                            PaperProps={{
                              style: {
                                maxHeight: ITEM_HEIGHT * 5.5,
                                width: 200
                              }
                            }}
                          >
                            {RecentPlayers.map((name, index) => (
                              <MenuItem
                                key={name}
                                //selected={value === "Pyxis"}
                                onClick={event =>
                                  this.onClickName(event, index)
                                }
                              >
                                {name}
                              </MenuItem>
                            ))}
                          </Menu>
                        </InputAdornment>
                      )
                    }}
                  />
                  {/*
                  <TextField
                    id="outlined-select-color"
                    select
                    label="Color"
                    className={classes.textField}
                    value={this.props.playersInfo[value].color}
                    onChange={event => this.props.onChangeColor(event, value)}
                    margin="normal"
                    variant="outlined"
                    inputProps={{ className: classes.menu }}
                  >
                    {Object.keys(Colors).map((value, index) => (
                      <MenuItem
                        value={Colors[value]}
                        style={{
                          color: Colors[value].main,
                          backgroundColor: Colors[value].sub
                        }}
                      >
                        {value}
                      </MenuItem>
                    ))}
                  </TextField>
                  */}
                </ListItem>
                <Divider />
              </div>
            ))}
          </List>
        </Dialog>
      </div>
    );
  }
}

export default withStyles(styles)(FullScreenDialog);
