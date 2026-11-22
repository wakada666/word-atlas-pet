/** 宠物进化形态。`ready` 为 false 的形态只有数据占位，形象后续补上。 */
export interface PetForm {
  id: string;
  label: string;
  minLevel: number;
  parent?: string;
  note?: string;
  ready: boolean;
}

export const PET_FORMS: PetForm[] = [
  { id: "puppy", label: "幼犬", minLevel: 1, note: "现在的形态", ready: true },
  { id: "rural", label: "中华田园犬", minLevel: 5, parent: "puppy", note: "形象开发中", ready: false },
  { id: "samoyed", label: "萨摩耶", minLevel: 10, parent: "rural", note: "进化分支 · 待开放", ready: false },
  { id: "shiba", label: "柴犬", minLevel: 10, parent: "rural", note: "进化分支 · 待开放", ready: false },
  { id: "ninja", label: "忍犬", minLevel: 10, parent: "rural", note: "进化分支 · 原创形象", ready: false },
];

export const formById = (id: string) => PET_FORMS.find((f) => f.id === id) ?? PET_FORMS[0];
