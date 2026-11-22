import { useEffect, useRef, useState } from "react";
import type { PetMood } from "./engine";
import type { PetAction } from "./sprite";

/** 角落场景里的自发行走：闲逛、走、坐、趴、睡、叫、伸懒腰。 */
export function usePetBehavior(mood: PetMood) {
  const [action, setAction] = useState<PetAction>("idle");
  const [facing, setFacing] = useState<1 | -1>(1);
  const [x, setX] = useState(0.52);
  const [walkMs, setWalkMs] = useState(0);
  const xRef = useRef(0.52);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = window.setTimeout(resolve, ms);
      });

    const loop = async () => {
      while (!cancelled) {
        setAction("idle");
        await wait(1400 + Math.random() * 2600);
        if (cancelled) return;

        const r = Math.random();
        const hungry = mood === "hungry";

        if (r < (hungry ? 0.55 : 0.42)) {
          const from = xRef.current;
          const to = Math.max(0.27, Math.min(0.73, from + (Math.random() * 0.4 - 0.2)));
          if (Math.abs(to - from) < 0.08) continue;
          setFacing(to > from ? 1 : -1);
          const ms = Math.round(800 + Math.abs(to - from) * 2600);
          setWalkMs(ms);
          xRef.current = to;
          setX(to);
          setAction("walk");
          await wait(ms);
          if (cancelled) return;
          setAction("idle");
          await wait(500);
        } else if (r < 0.7) {
          setAction("sit");
          await wait(5000 + Math.random() * 6000);
        } else if (r < 0.82) {
          setAction("lie");
          await wait(7000 + Math.random() * 7000);
        } else if (!hungry && r < 0.9) {
          setAction("sleep");
          await wait(12000 + Math.random() * 14000);
        } else if (r < 0.95) {
          setAction("bark");
          await wait(1800);
        } else {
          setAction("happy");
          await wait(2200);
        }
      }
    };

    loop();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mood]);

  return { action, facing, x, walkMs };
}
