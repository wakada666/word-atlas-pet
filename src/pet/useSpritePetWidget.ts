import { useEffect, useRef } from "react";
import { loadSpritePet, SpritePetWidget, type SpritePetState } from "sprite-pet";
import { store } from "../store/store";
import { DEFAULT_SKIN, manifestSrc, skinById } from "./skins";
import type { PetAction } from "./sprite";

const positionKey = (user: string | null) => `word-atlas:${user ?? "guest"}:petpos:v1`;

function readPosition(user: string | null): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(positionKey(user));
    if (!raw) return null;
    const value = JSON.parse(raw) as { x?: unknown; y?: unknown };
    if (typeof value?.x === "number" && typeof value?.y === "number") return { x: value.x, y: value.y };
  } catch {
    /* 忽略损坏的坐标 */
  }
  return null;
}

function savePosition(user: string | null, pos: { x: number; y: number }) {
  try {
    localStorage.setItem(positionKey(user), JSON.stringify({ x: Math.round(pos.x), y: Math.round(pos.y) }));
  } catch {
    /* 存储不可用时只影响下次位置 */
  }
}

function toState(action: PetAction, facing: 1 | -1): SpritePetState {
  switch (action) {
    case "walk":
    case "run":
      return facing === 1 ? "move-right" : "move-left";
    case "sit":
      return "waiting";
    case "lie":
    case "sleep":
      return "failure";
    case "bark":
      return "wave";
    case "eat":
      return "working";
    case "happy":
      return "jump";
    default:
      return "idle";
  }
}

/** 用 sprite-pet 运行时承载悬浮宠物：拖拽、视口约束、位置持久化。 */
export function useSpritePetWidget({
  skin,
  user,
  action,
  facing,
  enabled,
  onOpen,
}: {
  skin: string;
  user: string | null;
  action: PetAction;
  facing: 1 | -1;
  enabled: boolean;
  onOpen: () => void;
}) {
  const widgetRef = useRef<SpritePetWidget | null>(null);
  const actionRef = useRef(action);
  const facingRef = useRef(facing);
  const openRef = useRef(onOpen);
  actionRef.current = action;
  facingRef.current = facing;
  openRef.current = onOpen;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let widget: SpritePetWidget | null = null;
    let detach: (() => void) | null = null;
    let hintTimer = 0;
    const controller = new AbortController();

    const width = 140;
    const height = Math.round((width * 208) / 192);
    const mobile = window.matchMedia("(max-width: 600px)").matches;
    const position = readPosition(user) ?? {
      x: window.innerWidth - width - 16,
      y: window.innerHeight - height - (mobile ? 84 : 16),
    };

    void (async () => {
      try {
        const source = await loadSpritePet(manifestSrc(skin), { signal: controller.signal });
        if (cancelled) return;

        widget = new SpritePetWidget({
          source,
          width,
          animations: { failure: { loop: false } },
          floating: {
            draggable: true,
            resizable: false,
            minWidth: 110,
            maxWidth: 260,
            viewportMargin: 12,
            zIndex: 40,
            position,
          },
        });
        widgetRef.current = widget;
        widget.setState(toState(actionRef.current, facingRef.current));
        widget.play();

        const hint = document.createElement("span");
        hint.className = "sprite-pet-hint";
        hint.textContent = "按住我可以拖动";
        widget.element.append(hint);
        hintTimer = window.setTimeout(() => hint.remove(), 6000);

        let start: { x: number; y: number } | null = null;
        const onDown = (event: PointerEvent) => {
          start = { x: event.clientX, y: event.clientY };
          hint.remove();
        };
        const onUp = (event: PointerEvent) => {
          const from = start;
          start = null;
          if (!widget) return;
          savePosition(user, widget.getSnapshot().position);
          if (event.type === "pointerup" && from && Math.hypot(event.clientX - from.x, event.clientY - from.y) < 5) {
            openRef.current();
          }
        };
        const onCancel = () => {
          if (widget) savePosition(user, widget.getSnapshot().position);
        };

        widget.element.addEventListener("pointerdown", onDown);
        widget.element.addEventListener("pointerup", onUp);
        widget.element.addEventListener("pointercancel", onCancel);
        detach = () => {
          widget?.element.removeEventListener("pointerdown", onDown);
          widget?.element.removeEventListener("pointerup", onUp);
          widget?.element.removeEventListener("pointercancel", onCancel);
          hint.remove();
        };
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("宠物图集加载失败", error);
          // 本地宠物包不在仓库里，换机器/清理目录后自动回到默认宠物。
          if (skinById(skin).local) store.petSkin(DEFAULT_SKIN);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(hintTimer);
      if (widget) savePosition(user, widget.getSnapshot().position);
      detach?.();
      widget?.destroy();
      if (widgetRef.current === widget) widgetRef.current = null;
    };
  }, [skin, enabled, user]);

  useEffect(() => {
    widgetRef.current?.setState(toState(action, facing));
  }, [action, facing]);
}
