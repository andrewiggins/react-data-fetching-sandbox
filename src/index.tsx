import { useState, useEffect, useRef, Fragment, StrictMode } from "react";
import ReactDOM from "react-dom";
import { getItems, Item } from "./api";

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

function OverviewData({ dataType }: { dataType: string }) {
  // TODO: Probably a good time to convert this to useReducer,
  // especially once we add retrying state, heh
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [items, setItems] = useState<Item[]>(null);
  const [nextPage, setNextPage] = useState(null);

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
    setItems(null);
    setNextPage(null);
    setIsInitialLoad(true);

    let aborter = new AbortController();
    getItems({ dataType, page: 0, signal: aborter.signal }).then((result) => {
      console.log(`Finished loading initial ${dataType} page`);
      setItems(result.items);
      setNextPage(result.nextPage);
      setIsInitialLoad(false);

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
    console.log(`Loading ${dataType} page ${nextPage}...`);
    setIsLoadingMore(true);

    const result = await getItems({ dataType, page: nextPage });
    setIsLoadingMore(false);

    if (dataTypeRef.current === dataType) {
      console.log(`Finished loading ${dataType} page ${nextPage}.`);
      setItems(items.concat(result.items));
      setNextPage(result.nextPage);
    } else {
      console.log(
        `Ref (${dataTypeRef.current}) doesn't match request dataType ${dataType}`
      );
    }
  };

  // TODO: There's probably a better way to define chilren than all the inline conditionals... 🤷‍♂️
  return (
    <div>
      <h2>{dataType}</h2>

      {/* If we are doing the initial load, show a message */}
      {isInitialLoad && <p>Loading your {dataType} data...</p>}

      {/* If we have data, show it! */}
      {items && <ItemList items={items} />}

      {/* If we have another page of data and aren't already loading more data,
      show a button to load it  */}
      {nextPage != null && !isLoadingMore ? (
        <button onClick={loadMore}>Load more!</button>
      ) : null}

      {/* If we are currently loading more data, let the user know */}
      {isLoadingMore && <p>Loading more data...</p>}
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
