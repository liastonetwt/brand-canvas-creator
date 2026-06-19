import { useEffect, useRef, useState, useCallback } from "react";

export type DetectionMode = "combined" | "contrast" | "bright" | "dark";
export type ShapeMode = "circle" | "square";

export interface Palette {
  id: string;
  label: string;
  bg: string;
  ink: string;
  preview: string[];
}

export const PALETTES: Palette[] = [
  { id: "wob", label: "White on Black", bg: "#0a0a0a", ink: "#ffffff", preview: ["#000000", "#ffffff"] },
  { id: "bow", label: "Black on White", bg: "#f3f1ec", ink: "#0a0a0a", preview: ["#ffffff", "#000000"] },
  { id: "gold", label: "Gold on Dark", bg: "#0a0a0a", ink: "#d4a83a", preview: ["#000000", "#d4a83a"] },
  { id: "green", label: "Green on Dark", bg: "#0a0a0a", ink: "#3ad48a", preview: ["#000000", "#3ad48a"] },
];

export interface SizePreset { id: string; label: string; w: number; h: number }
export const SIZE_PRESETS: SizePreset[] = [
  { id: "p34_1200", label: "Portrait 3:4 (1200×1600)", w: 1200, h: 1600 },
  { id: "p34_1400", label: "Portrait 3:4 (1400×2000)", w: 1400, h: 2000 },
  { id: "story", label: "Instagram Story (1080×1920)", w: 1080, h: 1920 },
  { id: "sq", label: "Square (1080×1080)", w: 1080, h: 1080 },
  { id: "land", label: "Landscape 16:9 (1920×1080)", w: 1920, h: 1080 },
];

export interface BrandState {
  // image
  imageSrc: string | null;
  imageOpacity: number;
  // pixelate
  pixelSize: number;
  zoneSize: number;
  strokeOn: boolean;
  // frame text
  frameText: string;
  frameTextSize: number;
  // crosshair frame
  frameOn: boolean;
  frameSizePct: number;
  dashPattern: number;
  frameStroke: number;
  starSize: number;
  starPoints: number;
  showCrosshair: boolean;
  crosshairOpacity: number;
  // chain
  chainOn: boolean;
  chainCount: number;
  chainAngle: number;
  baseRadius: number;
  sizeRatio: number;
  intersectionsOn: boolean;
  markerSize: number;
  // detection
  detectionOn: boolean;
  detectionMode: DetectionMode;
  blockSize: number;
  threshold: number;
  maxCircles: number;
  minDistance: number;
  // shapes
  shapeMode: ShapeMode;
  minRadius: number;
  maxRadius: number;
  shapeStroke: number;
  sizeSeed: number;
  labelSize: number;
  overlayOpacity: number;
  showLabels: boolean;
  // connections
  maxDistance: number;
  lineWeight: number;
  // palette
  paletteId: string;
  // size
  sizeId: string;
  // texture
  textureSrc: string | null;
  textureOpacity: number;
  // mode flag (which tab created this state)
  mode: string;
}

export interface Zone { x: number; y: number; size: number }

export const defaultBrandState: BrandState = {
  imageSrc: null,
  imageOpacity: 0.85,
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
  mode: "circle-mapping",
};

interface Props {
  state: BrandState;
  zones: Zone[];
  onAddZone: (z: Zone) => void;
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
  try {
    img = ctx.getImageData(0, 0, w, h);
  } catch {
    return [];
  }
  const data = img.data;
  const cols = Math.floor(w / blockSize);
  const rows = Math.floor(h / blockSize);
  const scores: { x: number; y: number; score: number }[] = [];

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      let sum = 0, sum2 = 0, min = 255, max = 0, count = 0;
      for (let y = 0; y < blockSize; y += 2) {
        for (let x = 0; x < blockSize; x += 2) {
          const px = bx * blockSize + x;
          const py = by * blockSize + y;
          const i = (py * w + px) * 4;
          const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
          sum += l; sum2 += l * l;
          if (l < min) min = l;
          if (l > max) max = l;
          count++;
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

export function BrandCanvas({ state, zones, onAddZone, canvasRef }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const texRef = useRef<HTMLImageElement | null>(null);
  const [tick, setTick] = useState(0);

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

    const img = imgRef.current;
    if (img && img.width > 0) {
      ctx.save();
      ctx.globalAlpha = state.imageOpacity;
      const scale = Math.max(W / img.width, H / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
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
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
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
      // star
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

    // square frame
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
      ctx.fillText(state.frameText, 60, 80);
      ctx.textAlign = "right";
      ctx.fillText("Yordan Stoyanov", W - 60, 80);
      ctx.textAlign = "left";
      ctx.fillText("www.stoyanov.works", 60, H - 60);
      ctx.textAlign = "right";
      ctx.fillText("Sofia, Bulgaria", W - 60, H - 60);
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
  }, [state, zones, tick, canvasRef]);

  useEffect(() => { draw(); }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    onAddZone({
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy,
      size: state.zoneSize,
    });
  };

  const preset = SIZE_PRESETS.find((p) => p.id === state.sizeId) ?? SIZE_PRESETS[0];

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="relative h-full max-h-full flex items-center">
        <canvas
          ref={canvasRef}
          width={preset.w}
          height={preset.h}
          onClick={handleClick}
          className="block h-auto max-h-full w-auto max-w-full cursor-crosshair border border-border"
          style={{ aspectRatio: `${preset.w}/${preset.h}` }}
        />
      </div>
    </div>
  );
}
