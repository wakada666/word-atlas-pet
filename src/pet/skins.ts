export interface PetSkin {
  id: string;
  label: string;
  note: string;
}

export const PET_SKINS: PetSkin[] = [
  { id: "shiba", label: "柴犬", note: "元气橘" },
  { id: "rural", label: "中华田园犬", note: "温顺土狗" },
  { id: "samoyed", label: "萨摩耶", note: "微笑天使" },
  { id: "corgi", label: "柯基", note: "小短腿" },
  { id: "border", label: "边牧", note: "黑白聪明" },
];

export const DEFAULT_SKIN = "shiba";

export const isSkin = (id: string) => PET_SKINS.some((s) => s.id === id);
export const skinById = (id: string) => PET_SKINS.find((s) => s.id === id) ?? PET_SKINS[0];

const BASE = (import.meta.env?.BASE_URL ?? "/").replace(/\/$/, "");
export const skinSrc = (id: string) => `${BASE}/pet/${skinById(id).id}.jpg`;
