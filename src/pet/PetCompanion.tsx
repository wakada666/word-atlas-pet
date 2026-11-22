import { useEffect, useRef, useState } from "react";
import { useLocation } from "../lib/router";
import { store, useStore } from "../store/store";
import { toast } from "../ui/Toast";
import { DAILY_TARGET, fedToday, petMood } from "./engine";
import { PetSheet } from "./PetSheet";
import { SpritePet } from "./SpritePet";
import type { PetAction } from "./sprite";
import { usePetBehavior } from "./usePetBehavior";

/** 角落小场景里的宠物：自己走动、坐下、趴下、睡觉，点击打开面板。 */
export function PetCompanion() {
  const pet = useStore((s) => s.pet);
  const { route } = useLocation();
  const [open, setOpen] = useState(false);
  const [override, setOverride] = useState<PetAction | null>(null);
  const timer = useRef(0);
  const levelRef = useRef(pet.level);
  const totalRef = useRef(pet.totalWords);

  const mood = petMood(pet.satiety);
  const behavior = usePetBehavior(mood);
  const fed = fedToday(pet);
  const remaining = Math.max(0, DAILY_TARGET - fed);
  const bubble = mood === "hungry" ? `我饿了…还差 ${remaining} 个新词` : remaining > 0 ? `再学 ${remaining} 个新词就吃饱啦` : "今天吃得饱饱的！";

  const play = (action: PetAction, ms: number) => {
    setOverride(action);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOverride(null), ms);
  };

  useEffect(() => {
    store.petTick();
    const id = window.setInterval(() => store.petTick(), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (pet.level > levelRef.current) {
      toast(`${pet.name} 升到 Lv.${pet.level} 啦`, "ok");
      play("happy", 2600);
    }
    levelRef.current = pet.level;
  }, [pet.level, pet.name]);

  useEffect(() => {
    if (pet.totalWords > totalRef.current) play("eat", 2400);
    totalRef.current = pet.totalWords;
  }, [pet.totalWords]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (route.page === "learn") return null;

  return (
    <>
      <div className="pet-scene">
        <span className="pet-tag">
          {pet.name} · Lv.{pet.level}
        </span>
        <span className="pet-rug" aria-hidden />
        <span className={`pet-bowl ${fed >= DAILY_TARGET ? "is-full" : ""}`} aria-hidden />
        <button
          className={`pet-walker mood-${mood}`}
          style={{
            left: `${behavior.x * 100}%`,
            transition: behavior.action === "walk" ? `left ${behavior.walkMs}ms linear` : "none",
          }}
          onClick={() => setOpen(true)}
          aria-label={`打开宠物面板：${pet.name}，等级 ${pet.level}`}
        >
          <span className="pet-bubble" role="status">
            {bubble}
          </span>
          <SpritePet skin={pet.skin} action={override ?? behavior.action} facing={behavior.facing} size={116} />
        </button>
      </div>
      <PetSheet pet={pet} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
