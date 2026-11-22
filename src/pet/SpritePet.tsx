import { useEffect, useRef } from "react";
import { spriteSrc } from "./skins";
import { ACTION_META, PET_ACTIONS, type PetAction } from "./sprite";

const cache = new Map<string, HTMLImageElement>();

function imageFor(skin: string, file: string) {
  const key = `${skin}/${file}`;
  let img = cache.get(key);
  if (!img) {
    img = new Image();
    img.src = spriteSrc(skin, file);
    cache.set(key, img);
  }
  return img;
}

/** 逐帧绘制 100×100 的雪碧图；`facing=-1` 时水平翻转。 */
export function SpritePet({
  skin,
  action,
  size = 96,
  facing = 1,
  playing = true,
  className = "",
}: {
  skin: string;
  action: PetAction;
  size?: number;
  facing?: 1 | -1;
  playing?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    for (const a of PET_ACTIONS) imageFor(skin, ACTION_META[a].file);
  }, [skin]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const meta = ACTION_META[action];
    const img = imageFor(skin, meta.file);
    let raf = 0;
    let start = 0;

    const draw = (frame: number) => {
      ctx.clearRect(0, 0, 100, 100);
      ctx.save();
      if (facing === -1) {
        ctx.translate(100, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(img, frame * 100, 0, 100, 100, 0, 0, 100, 100);
      ctx.restore();
    };

    const tick = (t: number) => {
      if (!start) start = t;
      const raw = Math.floor(((t - start) / 1000) * meta.fps);
      const frame = meta.loop ? raw % meta.frames : Math.min(meta.frames - 1, raw);
      draw(frame);
      if (!meta.loop && frame >= meta.frames - 1) return;
      raf = requestAnimationFrame(tick);
    };

    if (!playing || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (img.complete && img.naturalWidth) draw(0);
      else {
        const still = () => draw(0);
        img.addEventListener("load", still, { once: true });
        return () => img.removeEventListener("load", still);
      }
      return;
    }

    const begin = () => {
      raf = requestAnimationFrame(tick);
    };
    if (img.complete && img.naturalWidth) begin();
    else {
      img.addEventListener("load", begin, { once: true });
      return () => img.removeEventListener("load", begin);
    }
    return () => cancelAnimationFrame(raf);
  }, [skin, action, facing, playing]);

  return (
    <canvas
      ref={ref}
      width={100}
      height={100}
      className={`sprite-pet ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
