import produce from "immer";
import { batchActions, enableBatching } from "redux-batched-actions";

// Types
export const createTypes = name => {
  return {
    INIT: `entities/${name}/INIT`,
    ADD: `entities/${name}/ADD`,
    UPDATE: `entities/${name}/UPDATE`,
    REMOVE: `entities/${name}/REMOVE`,
    REORDER: `entities/${name}/REORDER`,
    GROUP_REORDER: `entities/${name}/GROUP_REORDER`
  };
};

// Reducers
export const createByIdReducer = types =>
  enableBatching((state = {}, action) => {
    switch (action.type) {
      case types.INIT: {
        return {};
      }
      case types.ADD: {
        return produce(state, draft => {
          draft[action.id] = action.data;
        });
      }
      case types.UPDATE: {
        return produce(state, draft => {
          draft[action.id] = action.data;
        });
      }
      case types.REMOVE: {
        return produce(state, draft => {
          delete draft[action.id];
        });
      }
      default: {
        return state;
      }
    }
  });

export const createIndexReducer = types =>
  enableBatching((state = [], action) => {
    switch (action.type) {
      case types.INIT: {
        return [];
      }
      case types.ADD: {
        const isExists = state.includes(action.id);
        if (isExists) {
          return state;
        } else {
          return produce(state, draft => {
            draft.push(action.id);
          });
        }
      }
      case types.UPDATE: {
        const isExists = state.includes(action.id);
        if (isExists) {
          return state;
        } else {
          return produce(state, draft => {
            draft.push(action.id);
          });
        }
      }
      case types.REMOVE: {
        const index = state.indexOf(action.id);
        return produce(state, draft => {
          draft.splice(index, 1);
        });
      }
      case types.REORDER: {
        return produce(state, draft => {
          const [removed] = draft.splice(action.startIndex, 1);
          draft.splice(action.endIndex, 0, removed);
          return draft;
        });
      }
      default: {
        return state;
      }
    }
  });

export const createGroupByString = (field, data, defaultValue) => {
  if (typeof field === "string" && data[field] !== undefined) {
    return data[field];
  } else if (Array.isArray(field)) {
    return field
      .reduce((current, target, index) => {
        current[index] = data[target];
        return current;
      }, [])
      .join(".");
  } else {
    return defaultValue;
  }
};

export const createGroupByReducer = (types, field, defaultValue) =>
  enableBatching((state = {}, action) => {
    switch (action.type) {
      case types.INIT: {
        return {};
      }
      case types.ADD: {
        const groupBy = createGroupByString(field, action.data, defaultValue);
        if (groupBy) {
          const isExists = state[groupBy] && state[groupBy].includes(action.id);
          if (isExists) {
            return state;
          } else {
            return produce(state, draft => {
              if (!draft[groupBy]) {
                draft[groupBy] = [];
              }
              draft[groupBy].push(action.id);
            });
          }
        }
      }
      case types.UPDATE: {
        const groupBy = createGroupByString(field, action.data, defaultValue);
        if (groupBy) {
          const isExists = state[groupBy] && state[groupBy].includes(action.id);
          if (isExists) {
            return state;
          } else {
            return produce(state, draft => {
              if (!draft[groupBy]) {
                draft[groupBy] = [];
              }
              draft[groupBy].push(action.id);
            });
          }
        }
      }
      case types.REMOVE: {
        return produce(state, draft => {
          Object.keys(state).forEach(key => {
            const index = state[key].indexOf(action.id);
            if (index > -1) {
              draft[key].splice(index, 1);
            }
          });
        });
      }
      case types.GROUP_REORDER: {
        if (field !== action.field) return state;
        return produce(state, draft => {
          const [removed] = draft[action.key].splice(action.startIndex, 1);
          draft[action.key].splice(action.endIndex, 0, removed);
          return draft;
        });
      }
      default: {
        return state;
      }
    }
  });

// Actions
export const createActions = types => {
  return {
    init() {
      return {
        type: types.INIT
      };
    },
    add(id, data) {
      return {
        type: types.ADD,
        id,
        data
      };
    },
    update(id, data) {
      return {
        type: types.UPDATE,
        id,
        data
      };
    },
    remove(id) {
      return {
        type: types.REMOVE,
        id
      };
    },
    reorder(startIndex, endIndex) {
      return {
        type: types.REORDER,
        startIndex,
        endIndex
      };
    },
    groupReorder(field, key, startIndex, endIndex) {
      return {
        type: types.GROUP_REORDER,
        field,
        key,
        startIndex,
        endIndex
      };
    }
  };
};

// Operators
const getParentId = path => {
  const pathes = path.split("/");
  return pathes[pathes.length - 3] || "_root";
};

export const createSubscribeCollection = (
  actions,
  query,
  reversed = false
) => props => (dispatch, getState) => {
  const unsubscribe = query(props, getState()).onSnapshot(snapshot => {
    // const t = Date.now();
    const changes = snapshot.docChanges();
    if (reversed) {
      changes.reverse();
    }
    const bachedActions = changes.map(({ type, doc }) => {
      switch (type) {
        case "added": {
          return actions.add(doc.id, {
            ...doc.data({ serverTimestamps: "previous" }),
            _id: doc.id,
            _parentId: getParentId(doc.ref.path)
          });
        }
        case "modified": {
          return actions.update(doc.id, {
            ...doc.data(),
            _id: doc.id,
            _parentId: getParentId(doc.ref.path)
          });
        }
        case "removed": {
          return actions.remove(doc.id);
        }
      }
    });
    dispatch(batchActions(bachedActions));
    // console.log(Date.now() - t);
  });
  return () => {
    unsubscribe();
    dispatch(actions.init());
  };
};

export const createSubscribeDocument = (actions, ref) => id => dispatch => {
  return ref.doc(id).onSnapshot(doc => {
    return dispatch(
      actions.update(doc.id, {
        ...doc.data(),
        _parent: doc.ref.parent.path
      })
    );
  });
};
