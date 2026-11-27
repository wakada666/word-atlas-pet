import { sheetSrc, skinById } from "./skins";

/** 统一面板预览：直接裁 8×9 图集的第一帧，大图按 idle 行动起来。 */
export function PetPreview({ skin, size = 54, big = false }: { skin: string; size?: number; big?: boolean }) {
  const eight = skinById(skin).kind === "strip";
  const height = Math.round((size * 208) / 192);
  return (
    <span
      className={`pet-atlas-preview${big ? " is-big" : ""}${eight ? " is-eight" : ""}`}
      style={{
        width: size,
        height,
        backgroundImage: `url(${sheetSrc(skin)})`,
        backgroundSize: `${size * 8}px ${height * 9}px`,
      }}
      aria-hidden
    />
  );
}
