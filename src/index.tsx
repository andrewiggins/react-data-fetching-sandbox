import {
  useState,
  useEffect,
  useReducer,
  useRef,
  Fragment,
  StrictMode
} from "react";
import ReactDOM from "react-dom";
import { getItems, Item, ApiResponse, errorDataType } from "./api";

// NOTE!
// =======================
// The following example is not accessible. To keep this example simple,
// I left out the necessary focus management logic, though in a real app
// that would absolutely be necessary for UI similar to this.

/*
Two problems:
1. Reset state on prop change (anti-pattern?)
2. Need to avoid circular dependencies between initial load and load next page

Some approaches to solutions:
0. Manual Prop diffing
  - If request happens outside of an effect (e.g. in event hanlder),
    then we need to diff props to ensure that query result matches latest props
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

// From: https://reactjs.org/docs/hooks-faq.html#how-to-get-the-previous-props-or-state
function usePrevious<T>(value: T): T {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

interface ReducerState {
  state: "initialLoad" | "idle" | "updating" | "initialError" | "updateError";
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
      type: "INITIAL_ERROR";
      error: Error;
    }
  | {
      type: "LOAD_MORE_ERROR";
      error: Error;
    };

function reducer(state: ReducerState, action: Actions): ReducerState {
  switch (action.type) {
    case "INITIAL_LOAD":
      return { state: "initialLoad", items: null, nextPage: null };
    case "LOAD_MORE":
      return { ...state, state: "updating" };
    case "LOAD_COMPLETE":
      const { items, nextPage } = action.response;
      return {
        ...state,
        state: "idle",
        nextPage,
        items: state.items ? state.items.concat(items) : items
      };
    case "INITIAL_ERROR":
      return { ...state, state: "initialError", error: action.error };
    case "LOAD_MORE_ERROR":
      return { ...state, state: "updateError", error: action.error };
    default:
      throw new Error(`Unrecognized action: ${JSON.stringify(action)}`);
  }
}

const initialState: ReducerState = {
  state: "initialLoad",
  items: null,
  nextPage: null
};

function PageData(props: { user: string; dataType: string }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const prevProps = usePrevious(props);
  if (
    // If we aren't already doing an initialLoad and props have changed,
    // reset our state and kick off an initialLoad
    state.state !== "initialLoad" &&
    (prevProps.user !== props.user || prevProps.dataType !== props.dataType)
  ) {
    // This will immediately rerender this component and so is cheap
    dispatch({ type: "INITIAL_LOAD" });
  }

  useEffect(() => {
    console.log("useEffect:", {
      user: props.user,
      dataType: props.dataType,
      state: state.state,
      nextPage: state.nextPage
    });

    // We only execute the request if our reducer state specifies we should
    if (state.state === "initialLoad" || state.state === "updating") {
      console.log(
        `Loading ${props.user} ${props.dataType} page ${state.nextPage}...`
      );

      let aborter = new AbortController();
      getItems({
        user: props.user,
        dataType: props.dataType,
        page: state.nextPage,
        signal: aborter.signal
      })
        .then((response) => {
          console.log(
            `Finished loading ${props.user}'s ${props.dataType} page ${state.nextPage}.`
          );

          if (!aborter.signal.aborted) {
            dispatch({ type: "LOAD_COMPLETE", response });
          }
        })
        .catch((error) => {
          console.log("API failed with error:", error);
          dispatch({
            type:
              state.state === "initialLoad"
                ? "INITIAL_ERROR"
                : "LOAD_MORE_ERROR",
            error
          });
        })
        // @ts-ignore - Trust me TS, `finally` is a thing
        .finally(() => {
          // Probably not necessary, but I like it.
          aborter = null;
        });

      return () => {
        if (aborter) {
          console.log(
            `Aborting loading ${props.user} ${props.dataType} page ${state.nextPage}...`
          );
          aborter.abort();
        }
      };
    }
  }, [props.dataType, props.user, state.state, state.nextPage]);

  return (
    <div>
      <h2>
        {props.user}'s {props.dataType} data
      </h2>
      {
        // If we don't have any data, and we are loading it, let the user know
        state.state === "initialLoad" ? (
          <p>
            Loading {props.user}'s {props.dataType} data...
          </p>
        ) : state.state === "initialError" ? (
          <p>
            Whoops! That didn't work.{" "}
            <button onClick={() => dispatch({ type: "INITIAL_LOAD" })}>
              Try again
            </button>
          </p>
        ) : (
          <Fragment>
            {/* If we have data, show it! */}
            <ItemList items={state.items} />
            {state.state === "updateError" ? (
              // Uh oh, the previous load more failed. Let's give the user a chance to retry
              <p>
                Whoops! That didn't work.{" "}
                <button onClick={() => dispatch({ type: "LOAD_MORE" })}>
                  Try again
                </button>
              </p>
            ) : state.nextPage != null ? (
              // We have a nextPage! We should either show "loading" or a button to load it
              state.state === "updating" ? (
                // If we are currently loading more data, let the user know
                <p>Loading more data...</p>
              ) : (
                // If we have another page of data and aren't already loading more data,
                // show a button to load it
                <button onClick={() => dispatch({ type: "LOAD_MORE" })}>
                  Load more!
                </button>
              )
            ) : null}
            {/* We don't have a nextPage so show nothing */}
          </Fragment>
        )
      }
    </div>
  );
}

const users = ["Bill", "Susan"];
const dataTypes = ["browser", "voice", errorDataType];
function PropSelector({ name, values, value, setValue }) {
  return (
    <select
      name={name}
      value={value}
      onChange={(e) => {
        console.log(`Changing ${name} from ${value} to ${e.target.value}...`);
        setValue(e.target.value);
      }}
    >
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
      <PropSelector
        name="user"
        values={users}
        value={user}
        setValue={setUser}
      />
      <PropSelector
        name="dataType"
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
