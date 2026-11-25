import { sheetSrc, skinById } from "./skins";
import { SpritePet } from "./SpritePet";
import type { PetAction } from "./sprite";

/** 统一面板预览：strip 皮肤用帧条，atlas 皮肤直接裁 8×9 图集的第一帧。 */
export function PetPreview({
  skin,
  action = "idle",
  size = 54,
  big = false,
}: {
  skin: string;
  action?: PetAction;
  size?: number;
  big?: boolean;
}) {
  const meta = skinById(skin);
  if (meta.kind === "strip") {
    return <SpritePet skin={skin} action={action} size={size} playing={big} />;
  }

  const height = Math.round((size * 208) / 192);
  return (
    <span
      className={`pet-atlas-preview${big ? " is-big" : ""}`}
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
