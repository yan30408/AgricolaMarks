import React, { forwardRef } from "react";
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

const Transition = forwardRef((props, ref) => {
  return <Slide direction="up" ref={ref} {...props} />;
});

function AlertDialogSlide(props) {
  return (
    <Dialog
      open={props.isOpen}
      TransitionComponent={Transition}
      onClose={props.onClose}
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
  );
}

export default AlertDialogSlide;
