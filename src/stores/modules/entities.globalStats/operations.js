import actions from "./actions";
import { db } from "initializer";

const DOC_PATH = "stats/global";

export const fetchGlobalStats = () => async dispatch => {
  const snapshot = await db.doc(DOC_PATH).get();
  if (snapshot.exists) {
    dispatch(
      actions.update("summary", {
        ...snapshot.data(),
        _id: snapshot.id,
        _path: snapshot.ref.path
      })
    );
  } else {
    dispatch(actions.remove("summary"));
  }
};
