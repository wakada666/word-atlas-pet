export type DatasetKey = "open" | "primary" | "junior" | "private";

export interface DatasetOption {
  key: DatasetKey;
  dir: string;
  label: string;
  hint: string;
}

/** Static datasets shipped in `public/`. `private` is a dev-server-only extra. */
export const DATASETS: DatasetOption[] = [
  { key: "open", dir: "atlas", label: "开放图鉴", hint: "雅思与通用英语词汇" },
  { key: "primary", dir: "atlas-primary", label: "小学词库", hint: "人教版小学 3–6 年级词表" },
  { key: "junior", dir: "atlas-junior", label: "初中词库", hint: "中考必备词汇" },
];

export const datasetDir = (key: DatasetKey) => DATASETS.find((d) => d.key === key)?.dir ?? "atlas";
