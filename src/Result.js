import React from "react";
import { withStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import ListItemText from "@material-ui/core/ListItemText";
import ListItem from "@material-ui/core/ListItem";
import List from "@material-ui/core/List";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import CloseIcon from "@material-ui/icons/Close";
import Avatar from "@material-ui/core/Avatar";
import ImageIcon from "@material-ui/icons/Image";
import Slide from "@material-ui/core/Slide";
import AlertDialog from "./AlertDialog";
import RestartIcon from "@material-ui/icons/Refresh";

const styles = theme => ({
  appBar: {
    position: "relative"
  },
  flex: {
    flex: 1
  },
  button: {
    margin: theme.spacing.unit
  },
  rightIcon: {
    marginLeft: theme.spacing.unit
  }
});

function Transition(props) {
  return <Slide direction="down" {...props} />;
}

function ZeroPadding(num) {
  return ("00" + num).slice(-2);
}

class FullScreenDialog extends React.Component {
  state = {
    isOpenNewGame: false
  };

  onCloseNewGame = () => {
    this.setState({ isOpenNewGame: false });
  };

  onClickOkNewGame = () => {
    this.setState({ isOpenNewGame: false });
    this.props.onClickOkNewGame();
  };

  render() {
    const { classes } = this.props;
    let results = this.props.results.filter((value, index) => {
      return value.name != null;
    });
    results.sort((a, b) => {
      if (a.score.total < b.score.total) {
        return 1;
      } else {
        return -1;
      }
    });
    const now = new Date();
    const year = now.getYear() + 1900; // 年
    const month = ZeroPadding(now.getMonth() + 1); // 月
    const day = ZeroPadding(now.getDate()); // 日
    const hour = ZeroPadding(now.getHours()); // 時
    const min = ZeroPadding(now.getMinutes()); // 分
    const sec = ZeroPadding(now.getSeconds()); // 秒
    const date =
      year + "." + month + "." + day + " - " + hour + ":" + min + ":" + sec;

    return (
      <div>
        <Dialog
          fullScreen
          open={this.props.isOpen}
          onClose={this.props.onClose}
          TransitionComponent={Transition}
        >
          <AppBar className={classes.appBar}>
            <Toolbar>
              <IconButton
                color="inherit"
                onClick={this.props.onClose}
                aria-label="Close"
              >
                <CloseIcon />
              </IconButton>
              <Typography variant="h6" color="inherit" className={classes.flex}>
                Result
              </Typography>
            </Toolbar>
          </AppBar>
          <List>
            <ListItem divider>
              <ListItemText>
                <Typography variant="h6" align="center">
                  {date}
                </Typography>
              </ListItemText>
            </ListItem>
            {results.map((result, index) => (
              <div key={index}>
                <ListItem style={{ backgroundColor: result.color }} divider>
                  {/*
                  <Avatar>
                    <ImageIcon />
                  </Avatar>
                  */}
                  <ListItemText
                    primary={
                      <Typography variant="h6">{result.name}</Typography>
                    }
                    secondary={result.order}
                    style={{ width: 100 }}
                  />
                  <ListItemText
                    secondary={
                      <Typography variant="" align="left">
                        {`[ ${result.score.inFarm} + ${result.score.outside} ]`}
                      </Typography>
                    }
                  />
                  <ListItemText secondary={" → "} />
                  <ListItemText
                    primary={
                      <Typography variant="h5">{result.score.total}</Typography>
                    }
                  />
                </ListItem>
              </div>
            ))}
            <ListItem>
              <Button
                color="inherit"
                onClick={() => {
                  this.setState({ isOpenNewGame: true });
                }}
                fullWidth
                variant="contained"
                className={classes.button}
              >
                Newgame
                <RestartIcon className={classes.rightIcon} />
              </Button>
            </ListItem>
          </List>
          <AlertDialog
            title="Start New Game ?"
            isOpen={this.state.isOpenNewGame}
            onClose={this.onCloseNewGame}
            onClickOk={this.onClickOkNewGame}
          >
            新しいゲームを始めますか？
          </AlertDialog>
        </Dialog>
      </div>
    );
  }
}

export default withStyles(styles)(FullScreenDialog);
