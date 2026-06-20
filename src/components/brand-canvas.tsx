import { useEffect, useRef, useState, useCallback } from "react";

export type DetectionMode = "combined" | "contrast" | "bright" | "dark";
export type ShapeMode = "circle" | "square";
export type Tool = "pixelate" | "brush" | "eraser" | "line" | "rect" | "circle";
export type GeoPattern = "detection" | "radial" | "concentric" | "isometric" | "spiral" | "grid-dots";
export type HeroLayout = "centered" | "off-axis-left" | "off-axis-right" | "stacked-bottom" | "split";
export type ImageBlend = "normal" | "multiply" | "screen" | "difference" | "overlay";

export interface Palette {
  id: string;
  label: string;
  bg: string;
  ink: string;
  accent: string;
  preview: string[];
}

export const PALETTES: Palette[] = [
  { id: "wob", label: "White on Black", bg: "#0a0a0a", ink: "#ffffff", accent: "#ff3b30", preview: ["#000000", "#ffffff"] },
  { id: "bow", label: "Black on White", bg: "#f3f1ec", ink: "#0a0a0a", accent: "#ff3b30", preview: ["#ffffff", "#000000"] },
  { id: "gold", label: "Gold on Dark", bg: "#0a0a0a", ink: "#d4a83a", accent: "#ffffff", preview: ["#000000", "#d4a83a"] },
  { id: "green", label: "Green on Dark", bg: "#0a0a0a", ink: "#3ad48a", accent: "#ffffff", preview: ["#000000", "#3ad48a"] },
  { id: "cyan", label: "Cyan on Navy", bg: "#0a1530", ink: "#5ad8ff", accent: "#ff3b81", preview: ["#0a1530", "#5ad8ff"] },
  { id: "cream", label: "Ink on Cream", bg: "#ece4d2", ink: "#1a1410", accent: "#b03020", preview: ["#ece4d2", "#1a1410"] },
];

export interface SizePreset { id: string; label: string; w: number; h: number }
export const SIZE_PRESETS: SizePreset[] = [
  { id: "p34_1200", label: "Portrait 3:4 (1200×1600)", w: 1200, h: 1600 },
  { id: "p34_1400", label: "Portrait 3:4 (1400×2000)", w: 1400, h: 2000 },
  { id: "story", label: "Instagram Story (1080×1920)", w: 1080, h: 1920 },
  { id: "sq", label: "Square (1080×1080)", w: 1080, h: 1080 },
  { id: "land", label: "Landscape 16:9 (1920×1080)", w: 1920, h: 1080 },
  { id: "poster", label: "Poster A3 (1240×1754)", w: 1240, h: 1754 },
];

export interface Stroke {
  tool: "brush" | "eraser" | "line" | "rect" | "circle";
  color: "ink" | "bg" | "accent";
  size: number;
  pts: { x: number; y: number }[];
}

export interface Zone { x: number; y: number; size: number }

export interface BrandState {
  imageSrc: string | null;
  imageOpacity: number;
  imageInvert: boolean;
  imageGrayscale: boolean;
  imageBlend: ImageBlend;
  imageScale: number;
  pixelSize: number;
  zoneSize: number;
  strokeOn: boolean;
  frameText: string;
  frameTextSize: number;
  frameOn: boolean;
  frameSizePct: number;
  dashPattern: number;
  frameStroke: number;
  starSize: number;
  starPoints: number;
  showCrosshair: boolean;
  crosshairOpacity: number;
  chainOn: boolean;
  chainCount: number;
  chainAngle: number;
  baseRadius: number;
  sizeRatio: number;
  intersectionsOn: boolean;
  markerSize: number;
  detectionOn: boolean;
  detectionMode: DetectionMode;
  blockSize: number;
  threshold: number;
  maxCircles: number;
  minDistance: number;
  shapeMode: ShapeMode;
  minRadius: number;
  maxRadius: number;
  shapeStroke: number;
  sizeSeed: number;
  labelSize: number;
  overlayOpacity: number;
  showLabels: boolean;
  maxDistance: number;
  lineWeight: number;
  paletteId: string;
  sizeId: string;
  textureSrc: string | null;
  textureOpacity: number;
  // grid
  gridOn: boolean;
  gridSize: number;
  gridOpacity: number;
  // rings (concentric guides)
  ringsOn: boolean;
  ringsCount: number;
  ringsSpacing: number;
  // geo
  geoPattern: GeoPattern;
  geoDensity: number;
  geoRotation: number;
  // hero
  heroLayout: HeroLayout;
  heroTitle: string;
  heroSubtitle: string;
  heroTitleSize: number;
  heroBarOn: boolean;
  // drawing tool config
  tool: Tool;
  brushSize: number;
  brushColor: "ink" | "bg" | "accent";
  mode: string;
}

export const defaultBrandState: BrandState = {
  imageSrc: null,
  imageOpacity: 0.85,
  imageInvert: false,
  imageGrayscale: false,
  imageBlend: "normal",
  imageScale: 1,
  pixelSize: 16,
  zoneSize: 100,
  strokeOn: true,
  frameText: "Design & Strategy",
  frameTextSize: 14,
  frameOn: true,
  frameSizePct: 60,
  dashPattern: 8,
  frameStroke: 1,
  starSize: 40,
  starPoints: 4,
  showCrosshair: true,
  crosshairOpacity: 0.5,
  chainOn: true,
  chainCount: 11,
  chainAngle: 45,
  baseRadius: 220,
  sizeRatio: 0.85,
  intersectionsOn: true,
  markerSize: 5,
  detectionOn: false,
  detectionMode: "combined",
  blockSize: 16,
  threshold: 30,
  maxCircles: 80,
  minDistance: 40,
  shapeMode: "circle",
  minRadius: 4,
  maxRadius: 24,
  shapeStroke: 1,
  sizeSeed: 42,
  labelSize: 8,
  overlayOpacity: 1,
  showLabels: true,
  maxDistance: 150,
  lineWeight: 0.8,
  paletteId: "wob",
  sizeId: "p34_1200",
  textureSrc: null,
  textureOpacity: 0.5,
  gridOn: false,
  gridSize: 60,
  gridOpacity: 0.18,
  ringsOn: false,
  ringsCount: 8,
  ringsSpacing: 80,
  geoPattern: "detection",
  geoDensity: 24,
  geoRotation: 0,
  heroLayout: "centered",
  heroTitle: "STUDIO",
  heroSubtitle: "Brand · System · 2026",
  heroTitleSize: 120,
  heroBarOn: true,
  tool: "pixelate",
  brushSize: 18,
  brushColor: "ink",
  mode: "circle-mapping",
};

interface Props {
  state: BrandState;
  zones: Zone[];
  strokes: Stroke[];
  onAddZone: (z: Zone) => void;
  onStrokeStart: (s: Stroke) => void;
  onStrokeExtend: (pt: { x: number; y: number }) => void;
  onStrokeCommit: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Detected { x: number; y: number; score: number; r: number }

function detectCircles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: BrandState,
): Detected[] {
  const { blockSize, threshold, maxCircles, minDistance, detectionMode, minRadius, maxRadius, sizeSeed } = state;
  let img: ImageData;
  try { img = ctx.getImageData(0, 0, w, h); } catch { return []; }
  const data = img.data;
  const cols = Math.floor(w / blockSize);
  const rows = Math.floor(h / blockSize);
  const scores: { x: number; y: number; score: number }[] = [];
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      let sum = 0, sum2 = 0, count = 0;
      for (let y = 0; y < blockSize; y += 2) {
        for (let x = 0; x < blockSize; x += 2) {
          const px = bx * blockSize + x;
          const py = by * blockSize + y;
          const i = (py * w + px) * 4;
          const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
          sum += l; sum2 += l * l; count++;
        }
      }
      const mean = sum / count;
      const variance = sum2 / count - mean * mean;
      const contrast = Math.sqrt(Math.max(0, variance));
      let score = 0;
      if (detectionMode === "bright") score = mean / 2.55;
      else if (detectionMode === "dark") score = (255 - mean) / 2.55;
      else if (detectionMode === "contrast") score = contrast;
      else score = contrast * 0.6 + Math.abs(mean - 128) / 2.55 * 0.4;
      if (score >= threshold) scores.push({ x: bx * blockSize + blockSize / 2, y: by * blockSize + blockSize / 2, score });
    }
  }
  scores.sort((a, b) => b.score - a.score);
  const picked: Detected[] = [];
  const rng = mulberry32(sizeSeed);
  for (const c of scores) {
    if (picked.length >= maxCircles) break;
    let ok = true;
    for (const p of picked) {
      const dx = p.x - c.x, dy = p.y - c.y;
      if (dx * dx + dy * dy < minDistance * minDistance) { ok = false; break; }
    }
    if (ok) {
      const t = Math.min(1, c.score / 100);
      const r = minRadius + (maxRadius - minRadius) * (t * 0.5 + rng() * 0.5);
      picked.push({ ...c, r });
    }
  }
  return picked;
}

function colorFor(c: "ink" | "bg" | "accent", pal: Palette): string {
  return c === "ink" ? pal.ink : c === "bg" ? pal.bg : pal.accent;
}

export function BrandCanvas({ state, zones, strokes, onAddZone, onStrokeStart, onStrokeExtend, onStrokeCommit, canvasRef }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const texRef = useRef<HTMLImageElement | null>(null);
  const [tick, setTick] = useState(0);
  const drawingRef = useRef(false);

  useEffect(() => {
    if (!state.imageSrc) { imgRef.current = null; setTick((n) => n + 1); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; setTick((n) => n + 1); };
    img.onerror = () => { imgRef.current = null; setTick((n) => n + 1); };
    img.src = state.imageSrc;
  }, [state.imageSrc]);

  useEffect(() => {
    if (!state.textureSrc) { texRef.current = null; setTick((n) => n + 1); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { texRef.current = img; setTick((n) => n + 1); };
    img.onerror = () => { texRef.current = null; setTick((n) => n + 1); };
    img.src = state.textureSrc;
  }, [state.textureSrc]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const preset = SIZE_PRESETS.find((p) => p.id === state.sizeId) ?? SIZE_PRESETS[0];
    const W = preset.w, H = preset.h;
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    const pal = PALETTES.find((p) => p.id === state.paletteId) ?? PALETTES[0];

    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);

    // background image with filters + blend
    const img = imgRef.current;
    if (img && img.width > 0) {
      ctx.save();
      ctx.globalAlpha = state.imageOpacity;
      if (state.imageBlend !== "normal") ctx.globalCompositeOperation = state.imageBlend;
      const filters: string[] = [];
      if (state.imageGrayscale) filters.push("grayscale(1)");
      if (state.imageInvert) filters.push("invert(1)");
      ctx.filter = filters.length ? filters.join(" ") : "none";
      const scale = Math.max(W / img.width, H / img.height) * state.imageScale;
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      ctx.restore();
    }

    // grid
    if (state.gridOn) {
      ctx.save();
      ctx.globalAlpha = state.gridOpacity;
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 0.5;
      const g = Math.max(8, state.gridSize);
      for (let x = 0; x <= W; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();
    }

    // concentric rings
    if (state.ringsOn) {
      ctx.save();
      ctx.globalAlpha = state.crosshairOpacity;
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = state.frameStroke;
      const cx = W / 2, cy = H / 2;
      for (let i = 1; i <= state.ringsCount; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, i * state.ringsSpacing, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // pixelation zones
    if (zones.length > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (const z of zones) {
        const x = Math.max(0, z.x - z.size);
        const y = Math.max(0, z.y - z.size);
        const s = z.size * 2;
        try {
          const imgData = ctx.getImageData(x, y, s, s);
          const small = document.createElement("canvas");
          const block = Math.max(1, state.pixelSize);
          small.width = Math.max(1, Math.floor(s / block));
          small.height = Math.max(1, Math.floor(s / block));
          const sctx = small.getContext("2d")!;
          const tmp = document.createElement("canvas");
          tmp.width = s; tmp.height = s;
          tmp.getContext("2d")!.putImageData(imgData, 0, 0);
          sctx.imageSmoothingEnabled = false;
          sctx.drawImage(tmp, 0, 0, small.width, small.height);
          ctx.drawImage(small, 0, 0, small.width, small.height, x, y, s, s);
          if (state.strokeOn) {
            ctx.strokeStyle = pal.ink;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, s, s);
          }
        } catch { /* tainted */ }
      }
      ctx.restore();
    }

    // brush / shape strokes (drawing studio output)
    if (strokes.length > 0) {
      ctx.save();
      for (const st of strokes) {
        const col = colorFor(st.color, pal);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = st.size;
        if (st.tool === "eraser") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.strokeStyle = "rgba(0,0,0,1)";
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = col;
          ctx.fillStyle = col;
        }
        if (st.tool === "brush" || st.tool === "eraser") {
          if (st.pts.length < 2) {
            if (st.pts[0]) { ctx.beginPath(); ctx.arc(st.pts[0].x, st.pts[0].y, st.size / 2, 0, Math.PI * 2); ctx.fill(); }
          } else {
            ctx.beginPath();
            ctx.moveTo(st.pts[0].x, st.pts[0].y);
            for (let i = 1; i < st.pts.length; i++) ctx.lineTo(st.pts[i].x, st.pts[i].y);
            ctx.stroke();
          }
        } else if (st.tool === "line" && st.pts.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(st.pts[0].x, st.pts[0].y);
          ctx.lineTo(st.pts[st.pts.length - 1].x, st.pts[st.pts.length - 1].y);
          ctx.stroke();
        } else if (st.tool === "rect" && st.pts.length >= 2) {
          const a = st.pts[0], b = st.pts[st.pts.length - 1];
          ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
        } else if (st.tool === "circle" && st.pts.length >= 2) {
          const a = st.pts[0], b = st.pts[st.pts.length - 1];
          ctx.beginPath();
          ctx.arc(a.x, a.y, Math.hypot(b.x - a.x, b.y - a.y), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = state.overlayOpacity;
    ctx.strokeStyle = pal.ink;
    ctx.fillStyle = pal.ink;
    ctx.font = `${state.labelSize}px JetBrains Mono, monospace`;

    // chain circles
    if (state.chainOn) {
      const cx = W / 2, cy = H / 2;
      const ang = (state.chainAngle * Math.PI) / 180;
      const spacing = state.baseRadius * 0.7;
      ctx.lineWidth = state.shapeStroke;
      const centers: { x: number; y: number; r: number }[] = [];
      for (let i = 0; i < state.chainCount; i++) {
        const r = state.baseRadius * Math.pow(state.sizeRatio, i);
        const x = cx + Math.cos(ang) * spacing * i;
        const y = cy + Math.sin(ang) * spacing * i;
        centers.push({ x, y, r });
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
        if (state.showLabels) ctx.fillText(`${Math.round(x)} · ${Math.round(y)}`, x + 6, y - 6);
      }
      if (state.intersectionsOn) {
        for (let i = 0; i < centers.length - 1; i++) {
          const a = centers[i], b = centers[i + 1];
          const d = Math.hypot(b.x - a.x, b.y - a.y);
          if (d > Math.abs(a.r - b.r) && d < a.r + b.r) {
            const aa = (a.r * a.r - b.r * b.r + d * d) / (2 * d);
            const hh = Math.sqrt(Math.max(0, a.r * a.r - aa * aa));
            const px = a.x + (aa * (b.x - a.x)) / d;
            const py = a.y + (aa * (b.y - a.y)) / d;
            const rx = -(b.y - a.y) * (hh / d);
            const ry = (b.x - a.x) * (hh / d);
            ctx.beginPath(); ctx.arc(px + rx, py + ry, state.markerSize, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(px - rx, py - ry, state.markerSize, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    }

    // geo patterns
    if (state.geoPattern !== "detection") {
      ctx.save();
      ctx.lineWidth = state.shapeStroke;
      ctx.strokeStyle = pal.ink;
      ctx.fillStyle = pal.ink;
      const cx = W / 2, cy = H / 2;
      const rot = (state.geoRotation * Math.PI) / 180;
      const rng = mulberry32(state.sizeSeed);
      if (state.geoPattern === "radial") {
        const n = state.geoDensity;
        const R = Math.min(W, H) * 0.45;
        for (let i = 0; i < n; i++) {
          const a = rot + (Math.PI * 2 * i) / n;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * (state.minRadius * 4), cy + Math.sin(a) * (state.minRadius * 4));
          ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
          ctx.stroke();
          const rr = state.minRadius + rng() * (state.maxRadius - state.minRadius);
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (state.geoPattern === "concentric") {
        for (let i = 1; i <= state.geoDensity; i++) {
          ctx.beginPath();
          ctx.arc(cx, cy, (i / state.geoDensity) * Math.min(W, H) * 0.48, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (state.geoPattern === "isometric") {
        const step = Math.max(20, 600 / state.geoDensity);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        for (let x = -W; x <= W; x += step) {
          ctx.beginPath(); ctx.moveTo(x, -H); ctx.lineTo(x + H * 0.577, H); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, -H); ctx.lineTo(x - H * 0.577, H); ctx.stroke();
        }
        for (let y = -H; y <= H; y += step) {
          ctx.beginPath(); ctx.moveTo(-W, y); ctx.lineTo(W, y); ctx.stroke();
        }
        ctx.restore();
      } else if (state.geoPattern === "spiral") {
        const turns = state.geoDensity / 4;
        const steps = state.geoDensity * 40;
        ctx.beginPath();
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          const a = rot + t * Math.PI * 2 * turns;
          const r = t * Math.min(W, H) * 0.48;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (state.geoPattern === "grid-dots") {
        const step = Math.max(20, 800 / state.geoDensity);
        for (let y = step; y < H; y += step) {
          for (let x = step; x < W; x += step) {
            ctx.beginPath();
            ctx.arc(x, y, Math.max(1, state.minRadius * 0.6), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    // detection shapes + connections
    if (state.detectionOn) {
      const detected = detectCircles(ctx, W, H, state);
      ctx.lineWidth = state.shapeStroke;
      for (const d of detected) {
        ctx.beginPath();
        if (state.shapeMode === "circle") ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        else ctx.rect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
        ctx.stroke();
        if (state.showLabels) ctx.fillText(`${Math.round(d.x)},${Math.round(d.y)}`, d.x + d.r + 2, d.y);
      }
      if (state.maxDistance > 0) {
        ctx.lineWidth = state.lineWeight;
        const md = state.maxDistance;
        for (let i = 0; i < detected.length; i++) {
          for (let j = i + 1; j < detected.length; j++) {
            const dx = detected[i].x - detected[j].x, dy = detected[i].y - detected[j].y;
            const dist = Math.hypot(dx, dy);
            if (dist <= md) {
              ctx.globalAlpha = state.overlayOpacity * (1 - dist / md) * 0.8;
              ctx.beginPath();
              ctx.moveTo(detected[i].x, detected[i].y);
              ctx.lineTo(detected[j].x, detected[j].y);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = state.overlayOpacity;
      }
    }

    // crosshair
    if (state.showCrosshair) {
      ctx.save();
      ctx.globalAlpha = state.crosshairOpacity;
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = state.frameStroke;
      ctx.setLineDash([state.dashPattern, state.dashPattern]);
      ctx.beginPath();
      ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
      ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);
      if (state.starSize > 0) {
        const cx = W / 2, cy = H / 2, s = state.starSize / 2;
        for (let i = 0; i < state.starPoints; i++) {
          const a = (Math.PI * i) / state.starPoints;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
          ctx.lineTo(cx - Math.cos(a) * s, cy - Math.sin(a) * s);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    if (state.frameOn) {
      ctx.save();
      ctx.globalAlpha = state.crosshairOpacity;
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = state.frameStroke;
      ctx.setLineDash([state.dashPattern, state.dashPattern]);
      const short = Math.min(W, H);
      const size = (short * state.frameSizePct) / 100;
      ctx.strokeRect((W - size) / 2, (H - size) / 2, size, size);
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.restore();

    // frame text — corners
    if (state.frameText) {
      ctx.save();
      ctx.fillStyle = pal.ink;
      ctx.font = `${state.frameTextSize}px JetBrains Mono, monospace`;
      ctx.textAlign = "left";
      ctx.fillText(state.frameText, 60, 80);
      ctx.textAlign = "right";
      ctx.fillText("Yordan Stoyanov", W - 60, 80);
      ctx.textAlign = "left";
      ctx.fillText("www.stoyanov.works", 60, H - 60);
      ctx.textAlign = "right";
      ctx.fillText("Sofia, Bulgaria", W - 60, H - 60);
      ctx.restore();
    }

    // hero title overlay
    if (state.heroTitle) {
      ctx.save();
      ctx.fillStyle = pal.ink;
      const ts = state.heroTitleSize;
      ctx.font = `900 ${ts}px JetBrains Mono, monospace`;
      let tx = W / 2, ty = H / 2, align: CanvasTextAlign = "center";
      if (state.heroLayout === "off-axis-left") { tx = W * 0.08; ty = H * 0.5; align = "left"; }
      else if (state.heroLayout === "off-axis-right") { tx = W * 0.92; ty = H * 0.5; align = "right"; }
      else if (state.heroLayout === "stacked-bottom") { tx = W / 2; ty = H * 0.85; align = "center"; }
      else if (state.heroLayout === "split") { tx = W * 0.08; ty = H * 0.85; align = "left"; }
      ctx.textAlign = align;
      ctx.textBaseline = "middle";
      ctx.fillText(state.heroTitle.toUpperCase(), tx, ty);
      if (state.heroSubtitle) {
        ctx.font = `${Math.max(10, ts * 0.18)}px JetBrains Mono, monospace`;
        ctx.fillText(state.heroSubtitle, tx, ty + ts * 0.65);
      }
      if (state.heroBarOn) {
        ctx.fillRect(40, H - 40, W - 80, 4);
        ctx.fillRect(40, 36, W - 80, 4);
      }
      ctx.restore();
    }

    // texture overlay
    const tex = texRef.current;
    if (tex && tex.width > 0) {
      ctx.save();
      ctx.globalAlpha = state.textureOpacity;
      ctx.globalCompositeOperation = "screen";
      const sc = Math.max(W / tex.width, H / tex.height);
      const tw = tex.width * sc, th = tex.height * sc;
      ctx.drawImage(tex, (W - tw) / 2, (H - th) / 2, tw, th);
      ctx.restore();
    }
  }, [state, zones, strokes, tick, canvasRef]);

  useEffect(() => { draw(); }, [draw]);

  const toCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toCanvasCoords(e);
    if (state.tool === "pixelate") {
      onAddZone({ x: pt.x, y: pt.y, size: state.zoneSize });
      return;
    }
    drawingRef.current = true;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    onStrokeStart({ tool: state.tool, color: state.brushColor, size: state.brushSize, pts: [pt] });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    onStrokeExtend(toCanvasCoords(e));
  };

  const onPointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onStrokeCommit();
  };

  const preset = SIZE_PRESETS.find((p) => p.id === state.sizeId) ?? SIZE_PRESETS[0];

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="relative h-full max-h-full flex items-center">
        <canvas
          ref={canvasRef}
          width={preset.w}
          height={preset.h}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="block h-auto max-h-full w-auto max-w-full cursor-crosshair border border-border touch-none"
          style={{ aspectRatio: `${preset.w}/${preset.h}` }}
        />
      </div>
    </div>
  );
}
