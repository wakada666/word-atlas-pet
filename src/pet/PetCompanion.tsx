import { useEffect, useRef, useState } from "react";
import { useLocation } from "../lib/router";
import { activeUsername, store, useStore } from "../store/store";
import { toast } from "../ui/Toast";
import { petMood } from "./engine";
import { PetSheet } from "./PetSheet";
import type { PetAction } from "./sprite";
import { usePetBehavior } from "./usePetBehavior";
import { useSpritePetWidget } from "./useSpritePetWidget";

/** sprite-pet 悬浮层：可拖拽、会自己做动作，点击打开面板。 */
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
  const action = override ?? behavior.action;

  useSpritePetWidget({
    skin: pet.skin,
    user: activeUsername(),
    action,
    facing: behavior.facing,
    enabled: route.page !== "learn",
    onOpen: () => setOpen(true),
  });

  const play = (next: PetAction, ms: number) => {
    setOverride(next);
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

  return <PetSheet pet={pet} open={open} onClose={() => setOpen(false)} />;
}
