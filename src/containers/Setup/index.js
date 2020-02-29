import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { uniq } from "lodash";
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
  Slide
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";

import PlayerForm from "./PlayerForm";

function Transition(props) {
  return <Slide direction="down" {...props} />;
}

const FullScreenDialog = props => {
  const { classes } = props;
  const d = useDispatch();
  const isOpen = useSelector(state => store.getAppState(state, "isOpenSetup"));
  const recentPlayers = useSelector(state => store.getAppRecentPlayers(state));
  const validPlayers = useSelector(state => store.getValidPlayers(state));
  const onClose = useCallback(() => {
    // とりえあず最大20件
    const recPlayers = uniq([...validPlayers, ...recentPlayers]).slice(0, 20);
    d(
      store.actions.appStateMutate(state => {
        state.isOpenSetup = false;
      })
    );
    d(
      store.appPlayersMutate(state => {
        state.recent = recPlayers;
      })
    );
  }, [validPlayers, recentPlayers]);

  return (
    <div>
      <Dialog
        fullScreen
        open={isOpen}
        onClose={onClose}
        TransitionComponent={Transition}
      >
        <AppBar className={classes.appBar}>
          <Toolbar>
            <IconButton color="inherit" onClick={onClose} aria-label="Close">
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
              style={
                {
                  // backgroundColor: this.props.playersInfo[index].color.sub
                }
              }
            >
              <ListItem Item>
                <PlayerForm index={index} />>
              </ListItem>
              <Divider />
            </div>
          ))}
        </List>
      </Dialog>
    </div>
  );
};

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
export default withStyles(styles)(FullScreenDialog);
