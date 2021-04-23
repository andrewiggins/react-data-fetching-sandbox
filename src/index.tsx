import {
  useState,
  useEffect,
  useRef,
  useReducer,
  Fragment,
  StrictMode
} from "react";
import ReactDOM from "react-dom";
import { getItems, Item, ApiResponse } from "./api";

// NOTE!
// =======================
// The following example is not accessible. To keep this example simple,
// I left out the necessary focus management logic, though in a real app
// that would absolutely be necessary for UI similar to this.

/*
Ugh. Two problems:
1. Reset state on prop change (anti-pattern?)
2. Need to avoid circular dependencies between initial load and load next page

Some approaches to solutions:
0. Manual Prop diffing
  - diff props to ensure that query result matches latest props
1. Hashing + key
  - "hash" the props and use that as a key to the component (similar to what React docs on derived state suggested).
    Also how I think react-query partially deals with this
2. Lift the items state into the App component so all state is managed centrally
3. Hashing + Move query state out of the component (ala react-query)
  - would likely require some kind of query hashing solution too
*/

function ItemList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.data}</li>
      ))}
    </ul>
  );
}

function areShallowSame(o1, o2) {
  for (let key in o1) {
    if (o1[key] !== o2[key]) {
      return false;
    }
  }

  for (let key in o2) {
    if (o1[key] !== o2[key]) {
      return false;
    }
  }

  return false;
}

interface ReducerState {
  state: "loading" | "idle" | "error";
  items: Item[] | null;
  nextPage: number | null;
  error?: Error;
}

type Actions =
  | {
      type: "INITIAL_LOAD";
    }
  | {
      type: "LOAD_MORE";
    }
  | {
      type: "LOAD_COMPLETE";
      response: ApiResponse;
    }
  | {
      type: "ERROR";
      error: Error;
    };

function reducer(state: ReducerState, action: Actions): ReducerState {
  switch (action.type) {
    case "INITIAL_LOAD":
      return { state: "loading", items: null, nextPage: null };
    case "LOAD_MORE":
      return { ...state, state: "loading" };
    case "LOAD_COMPLETE":
      const { items, nextPage } = action.response;
      return {
        ...state,
        state: "idle",
        nextPage,
        items: state.items ? state.items.concat(items) : items
      };
    case "ERROR":
      return { ...state, error: action.error };
    default:
      throw new Error(`Unrecognized action: ${JSON.stringify(action)}`);
  }
}

const initialState: ReducerState = {
  state: "idle",
  items: null,
  nextPage: null
};

function PageData(props: { user: string; dataType: string }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const latestProps = useRef(props);

  useEffect(() => {
    latestProps.current = props;
  });

  // const { dataType, user } = props;

  // Load initial data:
  // Whenever we are first load or dataType changes,
  // replace our existing state with the right data
  useEffect(() => {
    // In case our dataType prop changes, let's clear our existing items
    // and page since they were for the old dataType and not relevant
    // to the current datatype
    console.log(`Loading ${props.user} initial ${props.dataType} page...`);
    dispatch({ type: "INITIAL_LOAD" });

    let aborter = new AbortController();
    getItems({
      user: props.user,
      dataType: props.dataType,
      page: 0,
      signal: aborter.signal
    }).then((response) => {
      console.log(
        `Finished ${props.user} loading initial ${props.dataType} page`
      );
      dispatch({ type: "LOAD_COMPLETE", response });

      // Initial data render was successful! Clear AbortController
      aborter = null;
    });

    return () => {
      if (aborter) {
        console.log(`Aborting initial ${props.dataType} page...`);
        aborter.abort();
      }
    };
  }, [props.dataType, props.user]);

  // Click handler to get more data
  const loadMore = async () => {
    console.log(`Loading ${props.dataType} page ${state.nextPage}...`);
    dispatch({ type: "LOAD_MORE" });

    const response = await getItems({
      user: props.user,
      dataType: props.dataType,
      page: state.nextPage
    });

    // 🤮 Whyyy??
    if (areShallowSame(props, latestProps.current)) {
      console.log(
        `Finished loading ${props.user}'s ${props.dataType} page ${state.nextPage}.`
      );
      dispatch({ type: "LOAD_COMPLETE", response });
    } else {
      console.log(
        `Latest props (${JSON.stringify(
          latestProps.current
        )}) doesn't match request props (${JSON.stringify(props)})`
      );
    }
  };

  return (
    <div>
      <h2>
        {props.user}'s {props.dataType} data
      </h2>
      {state.items == null ? (
        // If we don't have any data, and we are loading it, let the user know
        state.state === "loading" ? (
          <p>
            Loading {props.user}'s {props.dataType} data...
          </p>
        ) : null
      ) : (
        <Fragment>
          {/* If we have data, show it! */}
          <ItemList items={state.items} />
          {state.nextPage != null ? (
            state.state === "loading" ? (
              // If we are currently loading more data, let the user know
              <p>Loading more data...</p>
            ) : (
              // If we have another page of data and aren't already loading more data,
              // show a button to load it
              <button onClick={loadMore}>Load more!</button>
            )
          ) : null}
          {/* We don't have a nextPage so show nothing */}
        </Fragment>
      )}
    </div>
  );
}

const users = ["Bill", "Susan"];
const dataTypes = ["browser", "voice"];
function PropSelector({ values, value, setValue }) {
  return (
    <select value={value} onChange={(e) => setValue(e.target.value)}>
      {values.map((v) => (
        <option value={v} key={v}>
          {v}
        </option>
      ))}
    </select>
  );
}

function App() {
  const [user, setUser] = useState(users[0]);
  const [dataType, setDataType] = useState(dataTypes[0]);
  return (
    <Fragment>
      <PropSelector values={users} value={user} setValue={setUser} />
      <PropSelector
        values={dataTypes}
        value={dataType}
        setValue={setDataType}
      />
      <PageData user={user} dataType={dataType} />
    </Fragment>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(
  <StrictMode>
    <App />
  </StrictMode>,
  rootElement
);
