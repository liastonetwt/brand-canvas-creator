import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CircleCanvas, type CircleMappingState, type Zone, CANVAS_DIMS } from "@/components/circle-canvas";
import { Section, Toggle, ActionButton } from "@/components/ui/section";
import { SliderRow } from "@/components/ui/slider-row";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brand Assets Generator" },
      { name: "description", content: "Browser-based design tool for generating editorial brand assets with circle chains, pixelation zones, and crosshair frames." },
      { property: "og:title", content: "Brand Assets Generator" },
      { property: "og:description", content: "Generate editorial brand imagery with chains, crosshairs, and pixelation zones." },
    ],
  }),
  component: Index,
});

const TABS = ["Circle Mapping", "Drawing Studio", "Geo-Generator", "Hero Compositions"] as const;
type Tab = typeof TABS[number];

const PRESET_IMAGES = [
  "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&q=80",
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80",
  "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=1200&q=80",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80",
  "https://images.unsplash.com/photo-1604871000636-074fa5117945?w=1200&q=80",
  "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1200&q=80",
];

const defaultState: CircleMappingState = {
  imageSrc: null,
  imageOpacity: 0.85,
  pixelSize: 16,
  zoneSize: 100,
  strokeOn: true,
  strokeWidth: 1,
  strokeColor: "#ffffff",
  showCrosshair: true,
  crosshairOpacity: 0.5,
  showFrameBorder: true,
  frameText: "Design & Strategy",
  frameTextSize: 12,
  chainOn: true,
  chainCount: 11,
  chainAngle: 45,
  baseRadius: 220,
  sizeRatio: 0.85,
  spacing: 140,
  showLabels: true,
  bgColor: "#000000",
};

function Index() {
  const [tab, setTab] = useState<Tab>("Circle Mapping");
  const [s, setS] = useState<CircleMappingState>(defaultState);
  const [zones, setZones] = useState<Zone[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const update = <K extends keyof CircleMappingState>(k: K, v: CircleMappingState[K]) =>
    setS((p) => ({ ...p, [k]: v }));

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
      baseRadius: randInt(80, 320),
      sizeRatio: +rand(0.5, 1).toFixed(2),
      spacing: randInt(60, 220),
      imageSrc: withImage ? PRESET_IMAGES[randInt(0, PRESET_IMAGES.length - 1)] : p.imageSrc,
    }));
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => update("imageSrc", reader.result as string);
    reader.readAsDataURL(file);
  };

  const exportPNG = (mult = 1) => {
    const src = canvasRef.current;
    if (!src) return;
    const out = document.createElement("canvas");
    out.width = CANVAS_DIMS.w * mult;
    out.height = CANVAS_DIMS.h * mult;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, out.width, out.height);
    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `brand-asset-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground font-mono overflow-hidden">
      {/* Top bar */}
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
                onClick={() => setTab(t)}
                className={`px-3 py-1 text-[10px] uppercase tracking-[0.15em] border ${
                  tab === t
                    ? "bg-foreground text-background border-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportPNG(1)} className="px-3 py-1 text-[10px] uppercase tracking-[0.15em] border border-border hover:bg-control">Export 1×</button>
          <button onClick={() => exportPNG(2)} className="px-3 py-1 text-[10px] uppercase tracking-[0.15em] border border-border hover:bg-control">Export 2×</button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-[320px] shrink-0 border-r border-border bg-surface overflow-y-auto">
          {tab === "Circle Mapping" ? (
            <>
              <div className="px-4 pt-4 pb-4 space-y-2">
                <ActionButton variant="primary" onClick={() => randomizeAll(false)}>Randomize All</ActionButton>
                <ActionButton variant="primary" onClick={() => randomizeAll(true)}>Randomize All + Image</ActionButton>
                <p className="text-[10px] text-muted-foreground leading-snug pt-1">
                  Shuffles every parameter except chain settings. The + Image variant also picks a random preset image.
                </p>
              </div>

              <Section title="Image">
                <label className="block">
                  <span className="sr-only">Upload image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                    className="hidden"
                    id="img-upload"
                  />
                  <label htmlFor="img-upload" className="block w-full text-center bg-control border border-border px-3 py-2.5 text-[11px] uppercase tracking-[0.15em] cursor-pointer hover:bg-control-hover">
                    Upload Image
                  </label>
                </label>
                <select
                  value={s.imageSrc ?? ""}
                  onChange={(e) => update("imageSrc", e.target.value || null)}
                  className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono text-foreground"
                >
                  <option value="">Select preset image…</option>
                  {PRESET_IMAGES.map((u, i) => <option key={u} value={u}>Preset {i + 1}</option>)}
                </select>
                <SliderRow label="Image Opacity" hint="Fade the background image" value={s.imageOpacity} min={0} max={1} step={0.01} onChange={(v) => update("imageOpacity", v)} />
              </Section>

              <Section title="Pixelate">
                <p className="text-[10px] text-muted-foreground">Click on the canvas to place pixelation zones</p>
                <SliderRow label="Pixel Size" hint="Mosaic block size — larger = blockier" value={s.pixelSize} min={2} max={64} onChange={(v) => update("pixelSize", v)} />
                <SliderRow label="Zone Size" hint="Half-width of each square pixelation zone" value={s.zoneSize} min={20} max={300} onChange={(v) => update("zoneSize", v)} />
                <Toggle label="Stroke" value={s.strokeOn} onChange={(v) => update("strokeOn", v)} />
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton onClick={() => setZones((z) => z.slice(0, -1))}>Undo</ActionButton>
                  <ActionButton onClick={() => setZones([])}>Clear</ActionButton>
                </div>
                <p className="text-[10px] text-muted-foreground">{zones.length} zones placed</p>
              </Section>

              <Section title="Frame Text" defaultOpen={false}>
                <input
                  value={s.frameText}
                  onChange={(e) => update("frameText", e.target.value)}
                  placeholder="Label text"
                  className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono"
                />
                <SliderRow label="Text Size" value={s.frameTextSize} min={8} max={24} onChange={(v) => update("frameTextSize", v)} />
                <Toggle label="Frame Border" value={s.showFrameBorder} onChange={(v) => update("showFrameBorder", v)} />
              </Section>

              <Section title="Crosshair Frame" defaultOpen={false}>
                <Toggle label="Show Crosshair" value={s.showCrosshair} onChange={(v) => update("showCrosshair", v)} />
                <SliderRow label="Opacity" value={s.crosshairOpacity} min={0} max={1} step={0.01} onChange={(v) => update("crosshairOpacity", v)} />
              </Section>

              <Section title="Chain">
                <Toggle label="Chain" value={s.chainOn} onChange={(v) => update("chainOn", v)} />
                <SliderRow label="Count" hint="Number of circles in the chain" value={s.chainCount} min={1} max={12} onChange={(v) => update("chainCount", v)} />
                <SliderRow label="Angle" hint="Direction along which circles are laid out" value={s.chainAngle} min={0} max={360} onChange={(v) => update("chainAngle", v)} format={(v) => `${v}°`} />
                <SliderRow label="Base Radius" value={s.baseRadius} min={20} max={400} onChange={(v) => update("baseRadius", v)} />
                <SliderRow label="Size Ratio" hint="Each next circle = previous × ratio" value={s.sizeRatio} min={0.3} max={1} step={0.01} onChange={(v) => update("sizeRatio", v)} />
                <SliderRow label="Spacing" value={s.spacing} min={20} max={300} onChange={(v) => update("spacing", v)} />
                <Toggle label="Labels" value={s.showLabels} onChange={(v) => update("showLabels", v)} />
              </Section>

              <Section title="Export" defaultOpen={false}>
                <ActionButton onClick={() => exportPNG(1)}>Export PNG · 1×</ActionButton>
                <ActionButton onClick={() => exportPNG(2)}>Export PNG · 2×</ActionButton>
                <ActionButton onClick={() => exportPNG(3)}>Export PNG · 3×</ActionButton>
              </Section>
            </>
          ) : (
            <div className="p-6">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{tab}</p>
              <p className="mt-3 text-xs text-foreground leading-relaxed">
                This tab is scaffolded — controls coming next. The Circle Mapping tab is fully wired and reflects the reference screenshot.
              </p>
            </div>
          )}
        </aside>

        {/* Canvas area */}
        <main className="flex-1 min-w-0 bg-background flex items-center justify-center">
          {tab === "Circle Mapping" ? (
            <CircleCanvas state={s} zones={zones} onAddZone={(z) => setZones((p) => [...p, z])} onClearZones={() => setZones([])} canvasRef={canvasRef} />
          ) : (
            <div className="text-center font-mono">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Coming soon</p>
              <p className="mt-2 text-sm text-foreground">{tab}</p>
            </div>
          )}
        </main>
      </div>

      <footer className="border-t border-border px-5 h-7 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
        <span>Canvas {CANVAS_DIMS.w} × {CANVAS_DIMS.h}</span>
        <span>Tool created by <a href="https://stoyanov.works" className="text-foreground" target="_blank" rel="noreferrer">Yordan Stoyanov</a></span>
      </footer>
    </div>
  );
}
