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

function ItemList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.data}</li>
      ))}
    </ul>
  );
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

function OverviewData({ dataType }: { dataType: string }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 🤮 Whaaaatt??
  const dataTypeRef = useRef(dataType);
  dataTypeRef.current = dataType;

  // Load initial data:
  // Whenever we are first load or dataType changes,
  // replace our existing state with the right data
  useEffect(() => {
    // In case our dataType prop changes, let's clear our existing items
    // and page since they were for the old dataType and not relevant
    // to the current datatype
    console.log(`Loading initial ${dataType} page...`);
    dispatch({ type: "INITIAL_LOAD" });

    let aborter = new AbortController();
    getItems({ dataType, page: 0, signal: aborter.signal }).then((response) => {
      console.log(`Finished loading initial ${dataType} page`);
      dispatch({ type: "LOAD_COMPLETE", response });

      // Initial data render was successful! Clear AbortController
      aborter = null;
    });

    return () => {
      if (aborter) {
        console.log(`Aborting initial ${dataType} page...`);
        aborter.abort();
      }
    };
  }, [dataType]);

  // Click handler to get more data
  const loadMore = async () => {
    console.log(`Loading ${dataType} page ${state.nextPage}...`);
    dispatch({ type: "LOAD_MORE" });

    const response = await getItems({ dataType, page: state.nextPage });

    if (dataTypeRef.current === dataType) {
      console.log(`Finished loading ${dataType} page ${state.nextPage}.`);
      dispatch({ type: "LOAD_COMPLETE", response });
    } else {
      console.log(
        `Ref (${dataTypeRef.current}) doesn't match request dataType ${dataType}`
      );
    }
  };

  return (
    <div>
      <h2>{dataType}</h2>
      {/* {children} */}
      {state.items == null ? (
        // If we don't have any data, and we are loading it, let the user know
        state.state === "loading" ? (
          <p>Loading</p>
        ) : null
      ) : (
        <Fragment>
          {/* If we have data, show it! */}
          <ItemList items={state.items} />
          {state.nextPage != null ? (
            state.state === "loading" ? (
              // If we are currently loading more data, let the user know
              <p>Loading more data</p>
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

const dataTypes = ["browser", "voice"];
function DataTypeSelector({ dataType, setDataType }) {
  return (
    <div>
      <select value={dataType} onChange={(e) => setDataType(e.target.value)}>
        {dataTypes.map((d) => (
          <option value={d} key={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
}

function App() {
  const [dataType, setDataType] = useState(dataTypes[0]);
  return (
    <Fragment>
      <DataTypeSelector dataType={dataType} setDataType={setDataType} />
      <OverviewData dataType={dataType} />
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
