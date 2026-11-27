export type PairSearch = {
  a?: string;
  b?: string;
};

export function pairSearch(search: Record<string, unknown>): PairSearch {
  const read = (key: string) => {
    const value = search[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  };
  return { a: read("a"), b: read("b") };
}
