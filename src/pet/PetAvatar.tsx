import { useState } from "react";
import { sizeScale, type PetMood, type PetState } from "./engine";
import { skinById, skinSrc } from "./skins";
import { PetSprite } from "./PetSprite";

/** 生图形象；加载失败时回落到 SVG 小狗。 */
export function PetAvatar({ pet, mood, size = 104, animate = true }: { pet: PetState; mood: PetMood; size?: number; animate?: boolean }) {
  const [failed, setFailed] = useState(false);
  const skin = skinById(pet.skin);
  return (
    <div
      className={`pet-avatar ${animate ? "is-animated" : ""} mood-${mood}`}
      style={{ "--pet-size": `${size}px`, "--pet-scale": sizeScale(pet.level) } as React.CSSProperties}
    >
      {failed ? (
        <PetSprite level={pet.level} mood={mood} />
      ) : (
        <img src={skinSrc(pet.skin)} alt={`${skin.label}形象`} draggable={false} onError={() => setFailed(true)} />
      )}
    </div>
  );
}
