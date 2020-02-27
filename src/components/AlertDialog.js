import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Slide
} from "@material-ui/core";

import OkIcon from "@material-ui/icons/Check";
import CancelIcon from "@material-ui/icons/Cancel";

function Transition(props) {
  return <Slide direction="up" {...props} />;
}

function AlertDialogSlide(props) {
  return (
    <div>
      <Dialog
        open={props.isOpen}
        TransitionComponent={Transition}
        keepMounted
        onClose={props.onClose}
        aria-labelledby="alert-dialog-slide-title"
        aria-describedby="alert-dialog-slide-description"
      >
        <DialogTitle id="alert-dialog-title">{props.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {props.children}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClickOk} color="primary" variant="contained">
            <OkIcon />
            OK
          </Button>
          <Button
            onClick={props.onClose}
            color="secondary"
            variant="contained"
            autoFocus
          >
            <CancelIcon />
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default AlertDialogSlide;
