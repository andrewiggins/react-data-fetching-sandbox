const delayMs = 3000;

export interface Item {
  id: string;
  data: string;
}

export interface ApiResponse {
  items: Item[];
  nextPage: number;
}

const data: Record<string, ApiResponse[]> = {
  browser: [
    // Page 0 or null
    {
      items: [
        { id: "0", data: "browser item 0" },
        { id: "1", data: "browser item 1" },
        { id: "2", data: "browser item 2" }
      ],
      nextPage: 1
    },
    // Page 1
    {
      items: [
        { id: "3", data: "browser item 3" },
        { id: "4", data: "browser item 4" },
        { id: "5", data: "browser item 5" }
      ],
      nextPage: 2
    },
    // Page 2
    {
      items: [
        { id: "6", data: "browser item 6" },
        { id: "7", data: "browser item 7" },
        { id: "8", data: "browser item 8" }
      ],
      nextPage: null
    }
  ],
  voice: [
    // Page 0 or null
    {
      items: [
        { id: "0", data: "voice item 0" },
        { id: "1", data: "voice item 1" },
        { id: "2", data: "voice item 2" }
      ],
      nextPage: 1
    },
    // Page 1
    {
      items: [
        { id: "3", data: "voice item 3" },
        { id: "4", data: "voice item 4" },
        { id: "5", data: "voice item 5" }
      ],
      nextPage: 2
    },
    // Page 2
    {
      items: [
        { id: "6", data: "voice item 6" },
        { id: "7", data: "voice item 7" },
        { id: "8", data: "voice item 8" }
      ],
      nextPage: null
    }
  ]
};

interface Request {
  user: string;
  dataType: string;
  page: number;
  signal: AbortSignal;
}

export function getItems({
  user,
  dataType,
  page,
  signal = undefined
}: Request): Promise<ApiResponse> {
  page = page || 0;
  return new Promise((resolve) => {
    let timeoutId = setTimeout(() => {
      if (!signal || !signal.aborted) {
        let result = data[dataType][page];
        result = {
          ...result,
          items: result.items.map((item) => ({
            ...item,
            data: `${user} ${item.data}`
          }))
        };

        resolve(result);
      } else {
        console.log(
          `API: Load of ${user} ${dataType} page ${page} was aborted!`
        );
      }
    }, delayMs);

    if (signal) {
      signal.addEventListener("abort", () => {
        console.log(
          `API: Received abort event for ${user} ${dataType} page ${page}`
        );
        clearTimeout(timeoutId);
      });
    }
  });
}
