import { useEffect, useRef, useState } from "react";
import { useLocation } from "../lib/router";
import { store, useStore } from "../store/store";
import { toast } from "../ui/Toast";
import { DAILY_TARGET, fedToday, petMood } from "./engine";
import { PetAvatar } from "./PetAvatar";
import { PetSheet } from "./PetSheet";

/** 悬浮在页面上的宠物伙伴：会小范围走动，点击打开互动面板。 */
export function PetCompanion() {
  const pet = useStore((s) => s.pet);
  const { route } = useLocation();
  const [open, setOpen] = useState(false);
  const [x, setX] = useState(72);
  const xRef = useRef(72);
  const levelRef = useRef(pet.level);

  const mood = petMood(pet.satiety);
  const fed = fedToday(pet);
  const remaining = Math.max(0, DAILY_TARGET - fed);
  const bubble = mood === "hungry" ? `我饿了…还差 ${remaining} 个新词` : remaining > 0 ? `再学 ${remaining} 个新词就吃饱啦` : "今天吃得饱饱的！";

  useEffect(() => {
    store.petTick();
    const id = window.setInterval(() => store.petTick(), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (pet.level > levelRef.current) toast(`${pet.name} 升到 Lv.${pet.level} 啦`, "ok");
    levelRef.current = pet.level;
  }, [pet.level, pet.name]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = 38 + Math.random() * 46;
      xRef.current = next;
      setX(next);
    }, 9_000);
    return () => window.clearInterval(id);
  }, []);

  if (route.page === "learn") return null;

  return (
    <>
      <button className={`pet-companion mood-${mood}`} style={{ left: `${x}%` }} onClick={() => setOpen(true)} aria-label={`打开宠物面板：${pet.name}，等级 ${pet.level}`}>
        <span className="pet-bubble" role="status">
          {bubble}
        </span>
        <PetAvatar pet={pet} mood={mood} size={96} />
      </button>
      <PetSheet pet={pet} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
