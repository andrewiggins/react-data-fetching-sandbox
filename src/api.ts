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
  dataType: string;
  page: number;
  signal?: AbortSignal;
}

export function getItems({
  dataType,
  page,
  signal = undefined
}: Request): Promise<ApiResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!signal || !signal.aborted) {
        resolve(data[dataType][page ?? 0]);
      } else {
        console.log(`Load of ${dataType} page ${page} was aborted!`);
      }
    }, delayMs);
  });
}
