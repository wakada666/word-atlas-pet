import { ArrowRight, Heart, Lock, Sparkles, Utensils } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { burst } from "../lib/burst";
import { go } from "../lib/router";
import { store } from "../store/store";
import { Sheet } from "../ui/Sheet";
import { DAILY_TARGET, fedToday, levelInfo, petMood, type PetState } from "./engine";
import { PET_FORMS } from "./forms";
import { PetPreview } from "./PetPreview";
import { PET_SKINS, skinById } from "./skins";
import type { PetAction } from "./sprite";

const MOOD_LABEL = { happy: "精神满满", ok: "还不错", hungry: "肚子有点饿了" };

export function PetSheet({ pet, open, onClose }: { pet: PetState; open: boolean; onClose: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const [action, setAction] = useState<PetAction>("idle");
  const info = levelInfo(pet.xp);
  const fed = fedToday(pet);
  const mood = petMood(pet.satiety);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => setAction("idle"), [pet.skin]);

  const petIt = () => {
    const r = stage.current?.getBoundingClientRect();
    if (r) burst(r.left + r.width / 2, r.top + r.height / 2, 16);
    setAction("happy");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAction("idle"), 2400);
  };

  return (
    <Sheet open={open} onClose={onClose} label={`${pet.name} 的宠物面板`} className="pet-sheet">
      <div className="pet-sheet-head">
        <p className="eyebrow">我的宠物</p>
        <h2 className="display">
          {pet.name}
          <span className="chip">Lv.{pet.level}</span>
        </h2>
        <p className={`pet-mood mood-${mood}`}>
          {skinById(pet.skin).label} · {MOOD_LABEL[mood]}
        </p>
      </div>

      <div ref={stage} className={`pet-stage ${action === "happy" ? "is-petted" : ""}`}>
        <PetPreview skin={pet.skin} action={action} size={176} big />
      </div>

      <div className="pet-meters">
        <Meter label="饱腹" value={pet.satiety} max={100} tone={mood === "hungry" ? "warn" : "sage"} />
        <Meter label="今日新词" value={Math.min(fed, DAILY_TARGET)} max={DAILY_TARGET} tone="terra" note={`${fed}/${DAILY_TARGET}`} />
        <Meter label="经验" value={info.into} max={info.need} tone="sky" note={`${info.into}/${info.need}`} />
      </div>

      <dl className="pet-stats">
        <div>
          <dt>累计喂养</dt>
          <dd>{pet.totalWords} 词</dd>
        </div>
        <div>
          <dt>距离下一级</dt>
          <dd>{Math.max(0, info.need - info.into)} XP</dd>
        </div>
      </dl>

      <section className="pet-skins">
        <h3 className="eyebrow">形象</h3>
        <div className="pet-skin-grid">
          {PET_SKINS.map((s) => (
            <button key={s.id} className={pet.skin === s.id ? "is-on" : ""} onClick={() => store.petSkin(s.id)} aria-pressed={pet.skin === s.id}>
              <span className="pet-skin-thumb">
                <PetPreview skin={s.id} size={54} />
              </span>
              <b>{s.label}</b>
              <small>{s.note}</small>
            </button>
          ))}
        </div>
        <p className="muted">形象只是外观，不影响经验、饱腹和进化。</p>
      </section>

      <section className="pet-evo">
        <h3 className="eyebrow">进化</h3>
        <ul>
          {PET_FORMS.map((f) => {
            const current = f.id === pet.form;
            const unlocked = pet.level >= f.minLevel;
            return (
              <li key={f.id} className={`${current ? "is-current" : ""} ${unlocked && f.ready ? "is-ready" : ""}`}>
                <span className="pet-evo-icon">{current ? <Sparkles size={14} /> : unlocked && f.ready ? <Heart size={14} /> : <Lock size={13} />}</span>
                <b>{f.label}</b>
                <small>
                  Lv.{f.minLevel}
                  {f.note ? ` · ${f.note}` : ""}
                </small>
              </li>
            );
          })}
        </ul>
        <p className="muted">目前等级只改变体型，分支进化会逐步开放；忍犬将使用原创形象。</p>
      </section>

      <div className="pet-actions">
        <button className="btn btn-ghost" onClick={petIt}>
          <Heart size={17} /> 摸摸它
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            onClose();
            go({ page: "today" });
          }}
        >
          <Utensils size={17} /> 去喂它 <ArrowRight size={17} />
        </button>
      </div>
    </Sheet>
  );
}

function Meter({ label, value, max, tone, note }: { label: string; value: number; max: number; tone: "sage" | "terra" | "sky" | "warn"; note?: string }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`pet-meter tone-${tone}`}>
      <div className="pet-meter-head">
        <span>{label}</span>
        <small>{note ?? `${Math.round(value)}%`}</small>
      </div>
      <div className="pet-meter-track">
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
