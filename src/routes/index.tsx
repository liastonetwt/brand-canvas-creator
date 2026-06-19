import { useRef, useState, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BrandCanvas,
  type BrandState,
  type Zone,
  PALETTES,
  SIZE_PRESETS,
  defaultBrandState,
} from "@/components/brand-canvas";
import { Section, Toggle, ActionButton } from "@/components/ui/section";
import { SliderRow } from "@/components/ui/slider-row";
import skullAsset from "@/assets/preset-skull.webp.asset.json";
import horseAsset from "@/assets/preset-horse.webp.asset.json";
import flowerDarkAsset from "@/assets/preset-flower-dark.webp.asset.json";
import flowerLightAsset from "@/assets/preset-flower-light.webp.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brand Assets Generator" },
      { name: "description", content: "Generate editorial brand imagery with chains, detection, crosshairs, and pixelation zones." },
      { property: "og:title", content: "Brand Assets Generator" },
      { property: "og:description", content: "Browser-based brand asset generator." },
    ],
  }),
  component: Index,
});

const TABS = ["Circle Mapping", "Drawing Studio", "Geo-Generator", "Hero Compositions"] as const;
type Tab = typeof TABS[number];

const PRESET_IMAGES: { url: string; label: string }[] = [
  { url: skullAsset.url, label: "Skull / Antlers" },
  { url: horseAsset.url, label: "Horse Halftone" },
  { url: flowerDarkAsset.url, label: "Flower Dark" },
  { url: flowerLightAsset.url, label: "Flower Light" },
];

// Per-tab default overrides — same engine, different starting compositions
const TAB_PRESETS: Record<Tab, Partial<BrandState>> = {
  "Circle Mapping": {
    mode: "circle-mapping",
    chainOn: true, detectionOn: false,
    imageSrc: PRESET_IMAGES[0].url,
  },
  "Drawing Studio": {
    mode: "drawing-studio",
    chainOn: false, detectionOn: false,
    frameOn: true, showCrosshair: true,
    imageSrc: null,
    frameText: "Drawing Studio",
    paletteId: "bow",
  },
  "Geo-Generator": {
    mode: "geo-generator",
    chainOn: false, detectionOn: true,
    blockSize: 14, threshold: 28, maxCircles: 120, minDistance: 30,
    minRadius: 3, maxRadius: 18, maxDistance: 170, lineWeight: 0.6,
    imageSrc: PRESET_IMAGES[1].url, paletteId: "gold",
  },
  "Hero Compositions": {
    mode: "hero-compositions",
    chainOn: true, detectionOn: true, intersectionsOn: true,
    chainCount: 9, baseRadius: 280, sizeRatio: 0.88,
    maxCircles: 60, blockSize: 18, threshold: 35,
    imageSrc: PRESET_IMAGES[2].url, paletteId: "wob",
    sizeId: "story",
  },
};

function makeStateForTab(tab: Tab): BrandState {
  return { ...defaultBrandState, ...TAB_PRESETS[tab] } as BrandState;
}

interface Snapshot { state: BrandState; zones: Zone[] }

function SegButton<T extends string>({
  value, options, onChange,
}: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-mono border ${
            value === o.id
              ? "bg-foreground text-background border-foreground"
              : "bg-control text-foreground border-border hover:bg-control-hover"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Index() {
  const [tab, setTab] = useState<Tab>("Circle Mapping");
  const [s, setS] = useState<BrandState>(() => makeStateForTab("Circle Mapping"));
  const [zones, setZones] = useState<Zone[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Undo/redo history
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const skip = useRef(false);

  // capture history when state or zones changes (after debounce-y first paint)
  const prevRef = useRef<Snapshot>({ state: s, zones });
  useEffect(() => {
    if (skip.current) { skip.current = false; prevRef.current = { state: s, zones }; return; }
    if (prevRef.current.state === s && prevRef.current.zones === zones) return;
    past.current.push(prevRef.current);
    if (past.current.length > 80) past.current.shift();
    future.current = [];
    prevRef.current = { state: s, zones };
  }, [s, zones]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push({ state: s, zones });
    skip.current = true;
    setS(prev.state); setZones(prev.zones);
  }, [s, zones]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push({ state: s, zones });
    skip.current = true;
    setS(next.state); setZones(next.zones);
  }, [s, zones]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo]);

  const update = <K extends keyof BrandState>(k: K, v: BrandState[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  const switchTab = (t: Tab) => {
    setTab(t);
    setS(makeStateForTab(t));
    setZones([]);
  };

  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));

  const randomizeAll = (withImage = false) => {
    setS((p) => ({
      ...p,
      imageOpacity: +rand(0.4, 1).toFixed(2),
      pixelSize: randInt(6, 32),
      zoneSize: randInt(50, 180),
      crosshairOpacity: +rand(0.2, 0.8).toFixed(2),
      chainCount: randInt(3, 12),
      chainAngle: randInt(0, 360),
      baseRadius: randInt(120, 320),
      sizeRatio: +rand(0.6, 0.95).toFixed(2),
      blockSize: randInt(10, 24),
      threshold: randInt(20, 50),
      maxCircles: randInt(40, 140),
      minDistance: randInt(20, 60),
      minRadius: randInt(3, 8),
      maxRadius: randInt(15, 40),
      sizeSeed: randInt(1, 999),
      maxDistance: randInt(80, 240),
      lineWeight: +rand(0.5, 1.4).toFixed(1),
      frameSizePct: randInt(40, 80),
      dashPattern: randInt(4, 14),
      starSize: randInt(0, 80),
      starPoints: randInt(2, 8),
      paletteId: PALETTES[randInt(0, PALETTES.length - 1)].id,
      imageSrc: withImage ? PRESET_IMAGES[randInt(0, PRESET_IMAGES.length - 1)].url : p.imageSrc,
    }));
  };

  const handleUpload = (file: File, key: "imageSrc" | "textureSrc") => {
    const reader = new FileReader();
    reader.onload = () => update(key, reader.result as string);
    reader.readAsDataURL(file);
  };

  const exportPNG = (mult = 1) => {
    const src = canvasRef.current;
    if (!src) return;
    const out = document.createElement("canvas");
    out.width = src.width * mult;
    out.height = src.height * mult;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, out.width, out.height);
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `brand-asset-${s.mode}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const preset = SIZE_PRESETS.find((p) => p.id === s.sizeId) ?? SIZE_PRESETS[0];
  const palette = PALETTES.find((p) => p.id === s.paletteId) ?? PALETTES[0];

  return (
    <div className="flex h-screen flex-col bg-background text-foreground font-mono overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-5 h-12 shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xs font-semibold tracking-[0.2em] uppercase">Brand Assets Generator</h1>
            <span className="text-[10px] text-muted-foreground">
              by <a href="https://stoyanov.works" className="hover:text-foreground" target="_blank" rel="noreferrer">Yordan Stoyanov</a>
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`px-3 py-1 text-[10px] uppercase tracking-[0.15em] border ${
                  tab === t ? "bg-foreground text-background border-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={undo} title="Undo (⌘Z)" className="px-2 py-1 text-[10px] uppercase tracking-[0.15em] border border-border hover:bg-control">Undo</button>
          <button onClick={redo} title="Redo (⌘⇧Z)" className="px-2 py-1 text-[10px] uppercase tracking-[0.15em] border border-border hover:bg-control">Redo</button>
          <button onClick={() => exportPNG(1)} className="px-3 py-1 text-[10px] uppercase tracking-[0.15em] border border-border hover:bg-control">Export 1×</button>
          <button onClick={() => exportPNG(2)} className="px-3 py-1 text-[10px] uppercase tracking-[0.15em] border border-border hover:bg-control">Export 2×</button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-[320px] shrink-0 border-r border-border bg-surface overflow-y-auto">
          <div className="px-4 pt-4 pb-3 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{tab}</p>
            <ActionButton variant="primary" onClick={() => randomizeAll(false)}>Randomize All</ActionButton>
            <ActionButton variant="primary" onClick={() => randomizeAll(true)}>Randomize All + Image</ActionButton>
            <p className="text-[10px] text-muted-foreground leading-snug">Shuffles every parameter. The + Image variant also picks a random preset image.</p>
          </div>

          <Section title="Image">
            <input type="file" accept="image/*" id="img-upload" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "imageSrc")} />
            <label htmlFor="img-upload" className="block w-full text-center bg-control border border-border px-3 py-2.5 text-[11px] uppercase tracking-[0.15em] cursor-pointer hover:bg-control-hover">
              {s.imageSrc ? "Replace Image" : "Upload Image"}
            </label>
            <select value={s.imageSrc ?? ""} onChange={(e) => update("imageSrc", e.target.value || null)}
              className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono text-foreground">
              <option value="">Select preset image…</option>
              {PRESET_IMAGES.map((p) => <option key={p.url} value={p.url}>{p.label}</option>)}
            </select>
            <SliderRow label="Image Opacity" hint="Fade the background image" value={s.imageOpacity} min={0} max={1} step={0.01} onChange={(v) => update("imageOpacity", v)} />
          </Section>

          <Section title="Pixelate">
            <p className="text-[10px] text-muted-foreground">Click on the canvas to place pixelation zones</p>
            <SliderRow label="Pixel Size" hint="Mosaic block size — larger = blockier" value={s.pixelSize} min={2} max={64} onChange={(v) => update("pixelSize", v)} />
            <SliderRow label="Zone Size" hint="Half-width of each pixelation zone" value={s.zoneSize} min={20} max={300} onChange={(v) => update("zoneSize", v)} />
            <Toggle label="Stroke" value={s.strokeOn} onChange={(v) => update("strokeOn", v)} />
            <div className="grid grid-cols-2 gap-2">
              <ActionButton onClick={() => setZones((z) => z.slice(0, -1))}>Undo</ActionButton>
              <ActionButton onClick={() => setZones([])}>Clear</ActionButton>
            </div>
            <p className="text-[10px] text-muted-foreground">{zones.length} zones placed</p>
          </Section>

          <Section title="Frame Text" defaultOpen={false}>
            <input value={s.frameText} onChange={(e) => update("frameText", e.target.value)} placeholder="Label text"
              className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono" />
            <SliderRow label="Text Size" hint="Font size of the 4 corner labels" value={s.frameTextSize} min={8} max={28} onChange={(v) => update("frameTextSize", v)} />
          </Section>

          <Section title="Crosshair Frame" defaultOpen={false}>
            <Toggle label="Frame" value={s.frameOn} onChange={(v) => update("frameOn", v)} />
            <Toggle label="Crosshair" value={s.showCrosshair} onChange={(v) => update("showCrosshair", v)} />
            <SliderRow label="Frame Size" hint="Square size as % of canvas short side" value={s.frameSizePct} min={20} max={95} onChange={(v) => update("frameSizePct", v)} format={(v) => `${v}%`} />
            <SliderRow label="Dash Pattern" hint="Length of each dash + gap" value={s.dashPattern} min={0} max={24} onChange={(v) => update("dashPattern", v)} />
            <SliderRow label="Stroke" hint="Line thickness for frame and crosshair" value={s.frameStroke} min={0.5} max={4} step={0.1} onChange={(v) => update("frameStroke", v)} />
            <SliderRow label="Opacity" value={s.crosshairOpacity} min={0} max={1} step={0.01} onChange={(v) => update("crosshairOpacity", v)} />
            <SliderRow label="Star Size" hint="Diameter of the center asterisk — 0 hides it" value={s.starSize} min={0} max={120} onChange={(v) => update("starSize", v)} />
            <SliderRow label="Star Points" hint="Number of crossing lines" value={s.starPoints} min={2} max={10} onChange={(v) => update("starPoints", v)} />
          </Section>

          <Section title="Chain">
            <Toggle label="Chain" value={s.chainOn} onChange={(v) => update("chainOn", v)} />
            <SliderRow label="Count" hint="Number of circles in the chain" value={s.chainCount} min={1} max={20} onChange={(v) => update("chainCount", v)} />
            <SliderRow label="Angle" hint="Direction of chain — 0 vertical, 45 diagonal, 90 horizontal" value={s.chainAngle} min={0} max={360} onChange={(v) => update("chainAngle", v)} format={(v) => `${v}°`} />
            <SliderRow label="Base Radius" hint="Size of the center circle" value={s.baseRadius} min={20} max={500} onChange={(v) => update("baseRadius", v)} />
            <SliderRow label="Size Ratio" hint="Size multiplier per step — below 1 shrinks outward" value={s.sizeRatio} min={0.3} max={1} step={0.01} onChange={(v) => update("sizeRatio", v)} />
            <Toggle label="Intersections" value={s.intersectionsOn} onChange={(v) => update("intersectionsOn", v)} />
            <SliderRow label="Marker Size" hint="Dot size at each adjacent-circle intersection" value={s.markerSize} min={0} max={20} step={0.5} onChange={(v) => update("markerSize", v)} />
          </Section>

          <Section title="Detection" defaultOpen={false}>
            <Toggle label="Detection" value={s.detectionOn} onChange={(v) => update("detectionOn", v)} />
            <SegButton<typeof s.detectionMode>
              value={s.detectionMode}
              options={[
                { id: "combined", label: "Combined" },
                { id: "contrast", label: "Contrast" },
                { id: "bright", label: "Bright" },
                { id: "dark", label: "Dark" },
              ]}
              onChange={(v) => update("detectionMode", v)}
            />
            <SliderRow label="Block Size" hint="Analysis grid resolution — smaller = more detail" value={s.blockSize} min={4} max={48} onChange={(v) => update("blockSize", v)} />
            <SliderRow label="Threshold" hint="Min score to place a circle — higher = fewer, stronger hits" value={s.threshold} min={5} max={100} onChange={(v) => update("threshold", v)} />
            <SliderRow label="Max Circles" hint="Cap on total circles placed" value={s.maxCircles} min={5} max={400} onChange={(v) => update("maxCircles", v)} />
            <SliderRow label="Min Distance" hint="Spacing between circle centers" value={s.minDistance} min={5} max={120} onChange={(v) => update("minDistance", v)} />
          </Section>

          <Section title="Shapes" defaultOpen={false}>
            <SegButton<typeof s.shapeMode>
              value={s.shapeMode}
              options={[{ id: "circle", label: "Circle" }, { id: "square", label: "Square" }]}
              onChange={(v) => update("shapeMode", v)}
            />
            <SliderRow label="Min Radius" hint="Smallest circle size (low-score regions)" value={s.minRadius} min={1} max={30} onChange={(v) => update("minRadius", v)} />
            <SliderRow label="Max Radius" hint="Largest circle size (high-score regions)" value={s.maxRadius} min={5} max={80} onChange={(v) => update("maxRadius", v)} />
            <SliderRow label="Stroke" hint="Circle outline thickness" value={s.shapeStroke} min={0.5} max={4} step={0.1} onChange={(v) => update("shapeStroke", v)} />
            <SliderRow label="Size Seed" hint="Random seed for size variation" value={s.sizeSeed} min={1} max={999} onChange={(v) => update("sizeSeed", v)} />
            <SliderRow label="Label Size" hint="Font size of x,y coordinate labels" value={s.labelSize} min={6} max={18} onChange={(v) => update("labelSize", v)} />
            <Toggle label="Labels" value={s.showLabels} onChange={(v) => update("showLabels", v)} />
            <SliderRow label="Overlay Opacity" hint="Master opacity for circles, lines, dots, text" value={s.overlayOpacity} min={0} max={1} step={0.01} onChange={(v) => update("overlayOpacity", v)} />
          </Section>

          <Section title="Connections" defaultOpen={false}>
            <SliderRow label="Max Distance" hint="Circles within this range get connected — 0 hides lines" value={s.maxDistance} min={0} max={400} onChange={(v) => update("maxDistance", v)} />
            <SliderRow label="Line Weight" hint="Thickness of connecting lines" value={s.lineWeight} min={0.2} max={3} step={0.1} onChange={(v) => update("lineWeight", v)} />
          </Section>

          <Section title="Palette" defaultOpen={false}>
            <div className="grid grid-cols-4 gap-2">
              {PALETTES.map((p) => (
                <button key={p.id} onClick={() => update("paletteId", p.id)}
                  className={`flex h-10 items-center justify-center border ${s.paletteId === p.id ? "border-foreground" : "border-border"}`}
                  style={{ background: p.preview[0] }} title={p.label}>
                  <span className="block h-4 w-4 rounded-full border" style={{ background: p.preview[1], borderColor: p.preview[1] }} />
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">{palette.label}</p>
          </Section>

          <Section title="Size" defaultOpen={false}>
            <select value={s.sizeId} onChange={(e) => update("sizeId", e.target.value)}
              className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono">
              {SIZE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </Section>

          <Section title="Texture / Noise" defaultOpen={false}>
            <input type="file" accept="image/*" id="tex-upload" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "textureSrc")} />
            <label htmlFor="tex-upload" className="block w-full text-center bg-control border border-border px-3 py-2.5 text-[11px] uppercase tracking-[0.15em] cursor-pointer hover:bg-control-hover">
              {s.textureSrc ? "Replace Texture" : "Upload Texture"}
            </label>
            {s.textureSrc && (
              <ActionButton onClick={() => update("textureSrc", null)}>Remove Texture</ActionButton>
            )}
            <SliderRow label="Texture Opacity" hint="Opacity of the noise overlay (screen blend)" value={s.textureOpacity} min={0} max={1} step={0.01} onChange={(v) => update("textureOpacity", v)} />
          </Section>

          <Section title="Export" defaultOpen={false}>
            <ActionButton variant="primary" onClick={() => exportPNG(1)}>Download PNG</ActionButton>
            <ActionButton onClick={() => exportPNG(2)}>Export PNG · 2×</ActionButton>
            <ActionButton onClick={() => exportPNG(3)}>Export PNG · 3×</ActionButton>
          </Section>
        </aside>

        <main className="flex-1 min-w-0 bg-background flex items-center justify-center">
          <BrandCanvas state={s} zones={zones} onAddZone={(z) => setZones((p) => [...p, z])} canvasRef={canvasRef} />
        </main>
      </div>

      <footer className="border-t border-border px-5 h-7 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
        <span>{preset.w} × {preset.h} / {palette.label}</span>
        <span>Tool created by <a href="https://stoyanov.works" className="text-foreground" target="_blank" rel="noreferrer">Yordan Stoyanov</a></span>
      </footer>
    </div>
  );
}
