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
  /** 需要的等级；不填表示基础形象，随时可用 */
  unlockLevel?: number;
}

/** 每 5 级按顺序解锁一个形象。 */
export const SKIN_UNLOCK_STEP = 5;

const strip = (id: string, label: string, note: string): PetSkin => ({
  id,
  label,
  note,
  kind: "strip",
  manifest: `pets/${id}/pet.json`,
  sheet: `pets/${id}/spritesheet.png`,
});

const atlas = (id: string, label: string, unlockLevel?: number): PetSkin => ({
  id,
  label,
  note: unlockLevel ? `Lv.${unlockLevel} 解锁` : "初始解锁",
  kind: "atlas",
  manifest: `local-pets/${id}/pet.json`,
  sheet: `local-pets/${id}/spritesheet.webp`,
  local: true,
  unlockLevel,
});

export const PET_SKINS: PetSkin[] = [
  strip("golden", "金毛", "温顺大暖男"),
  strip("akita", "秋田", "忠犬系"),
  strip("dane", "大丹", "高个子"),
  strip("schnauzer", "雪纳瑞", "小老头"),
  strip("bernard", "圣伯纳", "毛茸茸"),
  strip("husky", "哈士奇", "蓝眼睛"),
  atlas("doro", "多萝"),
  atlas("goku", "悟空", 5),
  atlas("guga", "咕嘎", 10),
  atlas("hutao", "胡桃", 15),
  atlas("ikkun", "ikkun", 20),
  atlas("ikun-gaara", "我爱罗", 25),
  atlas("ikun-giegie", "坤坤", 30),
  atlas("ikunchick", "坤坤鸡", 35),
  atlas("kimlet-hover-clap", "Kimlet", 40),
  atlas("mini-elon", "小马斯克", 45),
  atlas("nimbus", "筋斗云", 50),
  atlas("shinchan", "小新", 55),
  atlas("trump", "特朗普", 60),
  atlas("usagi", "兔兔", 65),
];

export const DEFAULT_SKIN = "golden";

export const isSkin = (id: string) => PET_SKINS.some((s) => s.id === id);
export const skinById = (id: string) => PET_SKINS.find((s) => s.id === id) ?? PET_SKINS[0];

/** 基础形象（宠物犬）随时可用；其余按等级解锁。 */
export const isSkinUnlocked = (id: string, level: number) => {
  const unlock = skinById(id).unlockLevel;
  return unlock === undefined || level >= unlock;
};

export const BASE_SKINS = PET_SKINS.filter((s) => s.unlockLevel === undefined);
export const UNLOCK_SKINS = PET_SKINS.filter((s) => s.unlockLevel !== undefined);

const BASE = (import.meta.env?.BASE_URL ?? "/").replace(/\/$/, "");
const assetUrl = (path: string) => `${BASE}/${path.replace(/^\/+/, "")}`;

/** strip 皮肤的单个动作帧条（SpritePet 逐帧绘制用）。 */
export const spriteSrc = (skin: string, file: string) => assetUrl(`pet/dogs/${skinById(skin).id}/${file}.png`);

/** 整张图集，用于面板预览与静态缩略图。 */
export const sheetSrc = (skin: string) => assetUrl(skinById(skin).sheet ?? "");

/** sprite-pet 运行时加载的清单地址。 */
export const manifestSrc = (skin: string) => assetUrl(skinById(skin).manifest);
