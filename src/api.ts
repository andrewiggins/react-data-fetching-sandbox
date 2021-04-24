const delayMs = 3000;

export interface Item {
  id: string;
  data: string;
}

export interface ApiResponse {
  items: Item[];
  nextPage: number;
}

// export const initialErrorType = "initial error";
// export const loadMoreErrorType = "load more error";
export const errorDataType = "error";

const data: ApiResponse[] = [
  // Page 0 or null
  {
    items: [
      { id: "0", data: "item 0" },
      { id: "1", data: "item 1" },
      { id: "2", data: "item 2" }
    ],
    nextPage: 1
  },
  // Page 1
  {
    items: [
      { id: "3", data: "item 3" },
      { id: "4", data: "item 4" },
      { id: "5", data: "item 5" }
    ],
    nextPage: 2
  },
  // Page 2
  {
    items: [
      { id: "6", data: "item 6" },
      { id: "7", data: "item 7" },
      { id: "8", data: "item 8" }
    ],
    nextPage: null
  }
];

interface Request {
  user: string;
  dataType: string;
  page: number;
  signal: AbortSignal;
}

let errorRequestCount = 0;

export function getItems({
  user,
  dataType,
  page,
  signal = undefined
}: Request): Promise<ApiResponse> {
  page = page || 0;
  return new Promise((resolve, reject) => {
    let timeoutId;
    const handleAbort = () => {
      console.log(
        `API: Received abort event for ${user} ${dataType} page ${page}`
      );
      clearTimeout(timeoutId);
    };

    timeoutId = setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      if (signal && signal.aborted) {
        console.log(
          `API: Load of ${user} ${dataType} page ${page} was aborted!`
        );
        return;
      }

      if (dataType === errorDataType) {
        errorRequestCount++;
        console.log(
          `${dataType}: ${errorRequestCount} (${errorRequestCount % 3})`
        );
        if (errorRequestCount % 3 !== 0) {
          reject(new Error(`Request failed. Count: ${errorRequestCount}`));
          return;
        }
      }

      let result = data[page];
      result = {
        ...result,
        items: result.items.map((item) => ({
          ...item,
          data: `${user} ${dataType} ${item.data}`
        }))
      };

      resolve(result);
    }, delayMs);

    if (signal) {
      signal.addEventListener("abort", handleAbort);
    }
  });
}
