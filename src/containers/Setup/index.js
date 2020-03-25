import React, {
  memo,
  useCallback,
  useState,
  forwardRef,
  useRef,
  useEffect
} from "react";
import { useDispatch, useSelector } from "react-redux";
import store from "stores/interfaces";
import { uniq } from "lodash";
import { makeStyles } from "@material-ui/core/styles";
import {
  IconButton,
  List,
  ListItem,
  Dialog,
  Toolbar,
  AppBar,
  Typography,
  Divider,
  Slide,
  Button,
  TextField
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import ArrowBackIcon from "@material-ui/icons/ArrowBackIos";
import RefreshIcon from "@material-ui/icons/Refresh";
import AddIcon from "@material-ui/icons/Add";

import AlertDialog from "components/AlertDialog";
import PlayerForm from "./PlayerListItem";
import { Colors } from "Constants";

const Transition = forwardRef((props, ref) => {
  return <Slide direction="right" ref={ref} {...props} />;
});

const useStyles = makeStyles(theme => ({
  appBar: {
    position: "relative"
  },
  flex: {
    flex: 1
  },
  button: {
    margin: theme.spacing(1)
  },
  rightIcon: {
    marginLeft: theme.spacing(1)
  }
}));

const FullScreenDialog = props => {
  const classes = useStyles();
  const d = useDispatch();
  const [openReset, setOpenReset] = useState(false);

  const isOpen = useSelector(state => store.getAppState(state, "isOpenSetup"));
  const recentPlayers = useSelector(state => store.getAppRecentPlayers(state));
  const validPlayers = useSelector(state => store.getValidPlayers(state));
  const onClose = useCallback(() => {
    // とりえあず最大20件
    const playerNames = validPlayers.map(player => player.name);
    const recPlayers = uniq([...playerNames, ...recentPlayers]).slice(0, 20);
    d(
      store.appPlayersMutate(players => {
        players.recent = recPlayers;
      })
    );
    d(
      store.appStateMutate(state => {
        state.isOpenSetup = false;
      })
    );
  }, [d, validPlayers, recentPlayers]);
  const onClickReset = useCallback(() => {
    setOpenReset(true);
  }, []);
  const onCloseReset = useCallback(() => {
    setOpenReset(false);
  }, []);
  const onClickResetOK = useCallback(() => {
    setOpenReset(false);
    d(
      store.appStateMutate(state => {
        state.currentPlayerId = -1;
        state.currentOrder = 0;
      })
    );
    d(store.appPlayersInit);
    d(store.appResultsInit);
  }, [d]);
  // const { playerIndex } = props;
  const [searchText, setSearchText] = useState("");

  // const open = useSelector(state => store.getAppState(state, "isOpenPlayerSelect"));

  // const filteredUsers = useMemo(() => {
  //   return [];
  //   // if (!searchText) return props.systems;
  //   // return props.systems.filter(system => {
  //   //   return system.name.includes(searchText);
  //   // });
  // }, [searchText]);

  // const onClose = useCallback(() => {
  //   d(
  //     store.appStateMutate(state => {
  //       state.isOpenPlayerSelect = false;
  //     })
  //   );
  // }, [d]);

  const timer = useRef(null);
  const onChange = useCallback(e => {
    const text = e.currentTarget.value;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSearchText(text);
    }, 100);
  }, []);
  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);

  // const onSelect = useCallback(user => {
  //     d(
  //       store.appPlayersMutate(players => {
  //         players.current[playerIndex].name = user.displayName;
  //         players.current[playerIndex].uid = user.displayName;
  //         players.current[playerIndex].photoUrl = user.photoUrl;
  //         players.current[playerIndex].twitterId = user.twitterId;
  //       })
  //     );
  //     onClose();
  // }, [props.roomId]);

  return (
    <Dialog
      fullScreen
      open={isOpen}
      onClose={onClose}
      TransitionComponent={Transition}
    >
      <AppBar className={classes.appBar}>
        <Toolbar>
          <IconButton color="inherit" onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" color="inherit" className={classes.flex}>
            Setup Player Info
          </Typography>
          <IconButton color="inherit" onClick={onClose}>
            <AddIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <List>
        <ListItem>
          <TextField
            label="検索"
            variant="filled"
            fullWidth
            defaultValue={searchText}
            onChange={onChange}
          />
        </ListItem>
        {Array(5)
          .fill(0)
          .map((_, index) => (
            <div
              key={index}
              style={{
                backgroundColor: Colors[Object.keys(Colors)[index]].sub
              }}
            >
              <ListItem>
                <PlayerForm index={index} />
              </ListItem>
              <Divider />
            </div>
          ))}
      </List>
      <AlertDialog
        title="Reset player info ?"
        isOpen={openReset}
        onClose={onCloseReset}
        onClickOk={onClickResetOK}
      >
        参加プレイヤーをリセットしますか？
      </AlertDialog>
    </Dialog>
  );
};

export default memo(FullScreenDialog);
