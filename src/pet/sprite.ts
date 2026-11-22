export type PetAction = "idle" | "walk" | "run" | "sit" | "lie" | "sleep" | "bark" | "eat" | "happy";

export interface ActionMeta {
  /** public/pet/dogs/<skin>/<file>.png */
  file: string;
  frames: number;
  fps: number;
  loop: boolean;
}

/** 帧数来自素材包说明，单帧固定 100×100。 */
export const ACTION_META: Record<PetAction, ActionMeta> = {
  idle: { file: "idle", frames: 10, fps: 6, loop: true },
  walk: { file: "walk", frames: 8, fps: 10, loop: true },
  run: { file: "run", frames: 8, fps: 12, loop: true },
  sit: { file: "sitting", frames: 1, fps: 1, loop: true },
  lie: { file: "lying-down", frames: 7, fps: 7, loop: false },
  sleep: { file: "sleeping", frames: 1, fps: 1, loop: true },
  bark: { file: "bark", frames: 3, fps: 8, loop: true },
  eat: { file: "licking1", frames: 4, fps: 8, loop: true },
  happy: { file: "stretching", frames: 10, fps: 9, loop: false },
};

export const PET_ACTIONS = Object.keys(ACTION_META) as PetAction[];
