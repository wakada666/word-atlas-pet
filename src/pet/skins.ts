export interface PetSkin {
  id: string;
  label: string;
  note: string;
}

export const PET_SKINS: PetSkin[] = [
  { id: "golden", label: "金毛", note: "温顺大暖男" },
  { id: "akita", label: "秋田", note: "忠犬系" },
  { id: "dane", label: "大丹", note: "高个子" },
  { id: "schnauzer", label: "雪纳瑞", note: "小老头" },
  { id: "bernard", label: "圣伯纳", note: "毛茸茸" },
  { id: "husky", label: "哈士奇", note: "蓝眼睛" },
];

export const DEFAULT_SKIN = "golden";

export const isSkin = (id: string) => PET_SKINS.some((s) => s.id === id);
export const skinById = (id: string) => PET_SKINS.find((s) => s.id === id) ?? PET_SKINS[0];

const BASE = (import.meta.env?.BASE_URL ?? "/").replace(/\/$/, "");
/** 每种狗的动作图是 100×100 的横向帧条。 */
export const spriteSrc = (skin: string, file: string) => `${BASE}/pet/dogs/${skinById(skin).id}/${file}.png`;
