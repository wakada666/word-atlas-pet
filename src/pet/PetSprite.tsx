import { sizeScale, type PetMood } from "./engine";

const MOUTHS: Record<PetMood, string> = {
  happy: "M55 63 q5 5 10 0",
  ok: "M56 63 h8",
  hungry: "M56 64 q4 -2 8 0",
};

/** 手绘小狗，体型随等级放大；不用外部图片。 */
export function PetSprite({
  level,
  mood = "happy",
  className = "",
  animate = true,
}: {
  level: number;
  mood?: PetMood;
  className?: string;
  animate?: boolean;
}) {
  return (
    <div className={`pet-sprite mood-${mood} ${animate ? "is-animated" : ""} ${className}`} style={{ "--pet-scale": sizeScale(level) } as React.CSSProperties}>
      <svg viewBox="0 0 120 120" role="img" aria-label="小狗宠物">
        <ellipse className="pet-shadow" cx="60" cy="110" rx="25" ry="4.5" />
        <g className="pet-body">
          <path className="pet-tail" d="M86 82 q16 -4 14 -18 q-1 -7 -8 -7" />
          <rect className="pet-leg" x="43" y="88" width="12" height="19" rx="6" />
          <rect className="pet-leg" x="65" y="88" width="12" height="19" rx="6" />
          <ellipse className="pet-torso" cx="60" cy="82" rx="28" ry="21" />
          <ellipse className="pet-chest" cx="52" cy="87" rx="13" ry="14" />
          <g className="pet-head">
            <path className="pet-ear" d="M43 38 Q30 21 33 12 Q46 16 53 29 Z" />
            <path className="pet-ear" d="M77 38 Q90 21 87 12 Q74 16 67 29 Z" />
            <path className="pet-ear-inner" d="M44 33 Q36 22 37 17 Q45 20 49 29 Z" />
            <path className="pet-ear-inner" d="M76 33 Q84 22 83 17 Q75 20 71 29 Z" />
            <circle className="pet-face" cx="60" cy="52" r="24" />
            <ellipse className="pet-muzzle" cx="60" cy="60" rx="14" ry="10" />
            <ellipse className="pet-nose" cx="60" cy="55" rx="4" ry="3" />
            <g className="pet-eyes">
              {mood === "hungry" ? (
                <>
                  <path className="pet-eye-line" d="M46 47 q4 3 8 0" />
                  <path className="pet-eye-line" d="M66 47 q4 3 8 0" />
                </>
              ) : (
                <>
                  <circle className="pet-eye" cx="50" cy="47" r="3.2" />
                  <circle className="pet-eye" cx="70" cy="47" r="3.2" />
                  <circle className="pet-glint" cx="51" cy="46" r="1" />
                  <circle className="pet-glint" cx="71" cy="46" r="1" />
                </>
              )}
            </g>
            <path className="pet-mouth" d={MOUTHS[mood]} />
            <circle className="pet-cheek" cx="45" cy="58" r="3.4" />
            <circle className="pet-cheek" cx="75" cy="58" r="3.4" />
          </g>
        </g>
      </svg>
    </div>
  );
}
