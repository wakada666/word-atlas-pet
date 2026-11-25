export type PetSkinKind = "strip" | "atlas";

export interface PetSkin {
  id: string;
  label: string;
  note: string;
  /** strip：本项目合成的单动作帧条；atlas：sprite-pet 8×9 图集 */
  kind: PetSkinKind;
  /** 相对 BASE_URL 的 pet.json 路径 */
  manifest: string;
  /** atlas 专用的整张图路径 */
  sheet?: string;
  /** 仅本地存在、已被 .gitignore 排除的第三方宠物 */
  local?: boolean;
}

const strip = (id: string, label: string, note: string): PetSkin => ({
  id,
  label,
  note,
  kind: "strip",
  manifest: `pets/${id}/pet.json`,
});

const atlas = (id: string, label: string, note: string): PetSkin => ({
  id,
  label,
  note,
  kind: "atlas",
  manifest: `local-pets/${id}/pet.json`,
  sheet: `local-pets/${id}/spritesheet.webp`,
  local: true,
});

export const PET_SKINS: PetSkin[] = [
  strip("golden", "金毛", "温顺大暖男"),
  strip("akita", "秋田", "忠犬系"),
  strip("dane", "大丹", "高个子"),
  strip("schnauzer", "雪纳瑞", "小老头"),
  strip("bernard", "圣伯纳", "毛茸茸"),
  strip("husky", "哈士奇", "蓝眼睛"),
  atlas("doro", "多萝", "本地"),
  atlas("goku", "悟空", "本地"),
  atlas("guga", "咕嘎", "本地"),
  atlas("hutao", "胡桃", "本地"),
  atlas("ikkun", "ikkun", "本地"),
  atlas("ikun-gaara", "我爱罗", "本地"),
  atlas("ikun-giegie", "坤坤", "本地"),
  atlas("ikunchick", "坤坤鸡", "本地"),
  atlas("kimlet-hover-clap", "Kimlet", "本地"),
  atlas("mini-elon", "小马斯克", "本地"),
  atlas("nimbus", "筋斗云", "本地"),
  atlas("shinchan", "小新", "本地"),
  atlas("trump", "特朗普", "本地"),
  atlas("usagi", "兔兔", "本地"),
];

export const DEFAULT_SKIN = "golden";

export const isSkin = (id: string) => PET_SKINS.some((s) => s.id === id);
export const skinById = (id: string) => PET_SKINS.find((s) => s.id === id) ?? PET_SKINS[0];

const BASE = (import.meta.env?.BASE_URL ?? "/").replace(/\/$/, "");
const assetUrl = (path: string) => `${BASE}/${path.replace(/^\/+/, "")}`;

/** strip 皮肤的单个动作帧条。 */
export const spriteSrc = (skin: string, file: string) => assetUrl(`pet/dogs/${skinById(skin).id}/${file}.png`);

/** atlas 皮肤的整张图，用于面板缩略图与静态预览。 */
export const sheetSrc = (skin: string) => assetUrl(skinById(skin).sheet ?? "");

/** sprite-pet 运行时加载的清单地址。 */
export const manifestSrc = (skin: string) => assetUrl(skinById(skin).manifest);
