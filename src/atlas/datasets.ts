export type DatasetKey = "open" | "primary" | "junior" | "private";

export interface DatasetOption {
  key: DatasetKey;
  dir: string;
  label: string;
}

/** Static datasets shipped in `public/`. `private` is a dev-server-only extra. */
export const DATASETS: DatasetOption[] = [
  { key: "open", dir: "atlas", label: "开放图鉴" },
  { key: "primary", dir: "atlas-primary", label: "小学词库" },
  { key: "junior", dir: "atlas-junior", label: "初中词库" },
];

export const datasetDir = (key: DatasetKey) => DATASETS.find((d) => d.key === key)?.dir ?? "atlas";
