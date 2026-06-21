import { useEffect, useRef, useState, useCallback } from "react";
import { Section, Toggle, ActionButton } from "@/components/ui/section";
import { SliderRow } from "@/components/ui/slider-row";

// ============================================================
// Types & defaults
// ============================================================

export type SourceMode = "WEBCAM" | "UPLOAD";
export type BoxStyle = "BRACKET" | "FULL" | "DASHED";
export type MarkerStyle = "CROSS" | "RETICLE" | "DOT" | "DIAMOND";
export type ConnMode = "ALL PAIRS" | "NEAREST" | "CHAIN" | "HUB CENTER" | "RADIAL";
export type LineStyle = "STRAIGHT" | "CURVED" | "DASHED";
export type TrailMode = "SPATIAL" | "TEMPORAL";
export type TrailFade = "LINEAR" | "EXPONENTIAL" | "NONE";
export type CircleAnchor = "CENTROID" | "BOX CENTER" | "CANVAS CENTER";
export type BorderStyle = "FULL" | "CORNERS";
export type FramePos = "TOP LEFT" | "TOP RIGHT" | "BOTTOM LEFT" | "BOTTOM RIGHT";
export type LabelContent = "INDEX" | "AREA" | "POSITION" | "VELOCITY" | "CUSTOM";
export type LabelPos = "ABOVE BOX" | "INSIDE TOP" | "AT CENTROID" | "BELOW BOX";
export type AspectId = "16:9" | "1:1" | "4:3";

interface MTConfig {
  // Source
  sourceMode: SourceMode; flipH: boolean;
  // Detection
  threshold: number; minArea: number; maxArea: number; maxBlobs: number;
  resolution: number; frameSkip: boolean; motionSmooth: number;
  // Box
  boxEnabled: boolean; boxStyle: BoxStyle; boxPadding: number;
  boxWidth: number; boxColor: string; boxOpacity: number;
  // Marker
  markerEnabled: boolean; markerStyle: MarkerStyle; markerSize: number;
  markerColor: string; markerOpacity: number;
  // Connections
  connectionsEnabled: boolean; connectionMode: ConnMode; lineStyle: LineStyle;
  curveTension: number; connectionWidth: number; connectionColor: string;
  connectionOpacity: number; hubX: number; hubY: number;
  animateLines: boolean; animateSpeed: number;
  // Trail
  trailEnabled: boolean; trailMode: TrailMode; trailLength: number;
  lineSmooth: number; trailColor: string; trailWidth: number;
  trailOpacity: number; trailFade: TrailFade;
  // Circles
  circlesEnabled: boolean; circleAnchor: CircleAnchor;
  chainCount: number; chainAngle: number; baseRadius: number;
  sizeRatio: number; chainSpacing: number;
  circleStroke: boolean; circleStrokeWidth: number; circleStrokeColor: string; circleStrokeOpacity: number;
  circleFill: boolean; circleFillColor: string; circleFillOpacity: number;
  showCenterDot: boolean; centerDotRadius: number;
  // Frame
  frameEnabled: boolean;
  crosshairEnabled: boolean; crosshairOpacity: number; crosshairColor: string; tickMarks: boolean;
  borderEnabled: boolean; borderStyle: BorderStyle; borderWidth: number; borderColor: string; borderOpacity: number;
  frameTextEnabled: boolean; frameText: string; frameTextPosition: FramePos;
  frameTextSize: number; frameTextColor: string; frameTextOpacity: number;
  // Effects
  scanEnabled: boolean; scanDensity: number; scanOpacity: number; scanColor: string; scanAnimate: boolean;
  vignetteEnabled: boolean; vignetteIntensity: number; vignetteColor: string; vignetteSize: number;
  grainEnabled: boolean; grainAmount: number; grainSize: number; grainOpacity: number;
  // Labels
  labelsEnabled: boolean; labelContent: LabelContent; labelText: string;
  labelFontSize: number; labelColor: string; labelPosition: LabelPos;
  // Global
  videoOpacity: number; gridEnabled: boolean; gridOpacity: number;
  metricsEnabled: boolean; statusEnabled: boolean;
  // Export
  recordFPS: number; recordBitrate: number; exportMultiplier: number;
}

const DEFAULTS: MTConfig = {
  sourceMode: "WEBCAM", flipH: true,
  threshold: 127, minArea: 10, maxArea: 500, maxBlobs: 50,
  resolution: 1.0, frameSkip: true, motionSmooth: 0.5,
  boxEnabled: true, boxStyle: "BRACKET", boxPadding: 0,
  boxWidth: 2, boxColor: "#ffffff", boxOpacity: 100,
  markerEnabled: false, markerStyle: "CROSS", markerSize: 24,
  markerColor: "#ffffff", markerOpacity: 100,
  connectionsEnabled: true, connectionMode: "ALL PAIRS", lineStyle: "STRAIGHT",
  curveTension: 0.3, connectionWidth: 1, connectionColor: "#ffffff",
  connectionOpacity: 80, hubX: 50, hubY: 50,
  animateLines: false, animateSpeed: 1,
  trailEnabled: true, trailMode: "SPATIAL", trailLength: 30,
  lineSmooth: 8, trailColor: "#ffffff", trailWidth: 1,
  trailOpacity: 70, trailFade: "LINEAR",
  circlesEnabled: false, circleAnchor: "CENTROID",
  chainCount: 3, chainAngle: 45, baseRadius: 80, sizeRatio: 0.7, chainSpacing: 60,
  circleStroke: true, circleStrokeWidth: 1, circleStrokeColor: "#ffffff", circleStrokeOpacity: 90,
  circleFill: false, circleFillColor: "#ffffff", circleFillOpacity: 15,
  showCenterDot: true, centerDotRadius: 4,
  frameEnabled: false,
  crosshairEnabled: false, crosshairOpacity: 60, crosshairColor: "#ffffff", tickMarks: false,
  borderEnabled: false, borderStyle: "CORNERS", borderWidth: 1, borderColor: "#ffffff", borderOpacity: 80,
  frameTextEnabled: false, frameText: "BRAND-001", frameTextPosition: "BOTTOM LEFT",
  frameTextSize: 11, frameTextColor: "#ffffff", frameTextOpacity: 70,
  scanEnabled: false, scanDensity: 4, scanOpacity: 20, scanColor: "#000000", scanAnimate: false,
  vignetteEnabled: false, vignetteIntensity: 40, vignetteColor: "#000000", vignetteSize: 70,
  grainEnabled: false, grainAmount: 25, grainSize: 1, grainOpacity: 20,
  labelsEnabled: false, labelContent: "INDEX", labelText: "",
  labelFontSize: 10, labelColor: "#ffffff", labelPosition: "ABOVE BOX",
  videoOpacity: 100, gridEnabled: false, gridOpacity: 30,
  metricsEnabled: false, statusEnabled: true,
  recordFPS: 30, recordBitrate: 8, exportMultiplier: 1,
};

interface Blob {
  x: number; y: number; area: number;
  minX: number; maxX: number; minY: number; maxY: number;
  width: number; height: number;
  vx: number; vy: number;
  id: number | null;
  history: { x: number; y: number }[];
}

// ============================================================
// Engine
// ============================================================

function hexToRgba(hex: string, alpha = 1): string {
  if (!hex || hex.length < 7) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function floodFill(binary: Uint8Array, labels: Int32Array, w: number, h: number, sx: number, sy: number, label: number): Blob {
  const stack: [number, number][] = [[sx, sy]];
  let area = 0, sumX = 0, sumY = 0;
  let minX = sx, maxX = sx, minY = sy, maxY = sy;
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    const idx = y * w + x;
    if (binary[idx] !== 1 || labels[idx] !== 0) continue;
    labels[idx] = label;
    area++; sumX += x; sumY += y;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return {
    x: sumX / area, y: sumY / area, area,
    minX, maxX, minY, maxY,
    width: maxX - minX, height: maxY - minY,
    vx: 0, vy: 0, id: null, history: [],
  };
}

function detectBlobs(video: HTMLVideoElement, canvas: HTMLCanvasElement, cfg: MTConfig): Blob[] {
  const scale = cfg.resolution;
  const pw = Math.max(1, Math.floor(canvas.width * scale));
  const ph = Math.max(1, Math.floor(canvas.height * scale));
  const tmp = document.createElement("canvas");
  tmp.width = pw; tmp.height = ph;
  const tctx = tmp.getContext("2d", { willReadFrequently: true })!;
  try { tctx.drawImage(video, 0, 0, pw, ph); } catch { return []; }
  const data = tctx.getImageData(0, 0, pw, ph).data;
  const binary = new Uint8Array(pw * ph);
  for (let i = 0; i < data.length; i += 4) {
    const b = (data[i] + data[i + 1] + data[i + 2]) / 3;
    binary[i / 4] = b > cfg.threshold ? 1 : 0;
  }
  const labels = new Int32Array(pw * ph);
  const blobs: Blob[] = [];
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const idx = y * pw + x;
      if (binary[idx] === 1 && labels[idx] === 0) {
        const b = floodFill(binary, labels, pw, ph, x, y, blobs.length + 1);
        if (b.area >= cfg.minArea && b.area <= cfg.maxArea) blobs.push(b);
      }
    }
  }
  blobs.sort((a, b) => b.area - a.area);
  const result = blobs.slice(0, cfg.maxBlobs);
  const inv = 1 / scale;
  result.forEach(b => {
    b.x *= inv; b.y *= inv;
    b.minX *= inv; b.maxX *= inv; b.minY *= inv; b.maxY *= inv;
    b.width = b.maxX - b.minX; b.height = b.maxY - b.minY;
  });
  return result;
}

function matchBlobs(curr: Blob[], prev: Blob[], smoothing: number): Blob[] {
  if (!prev.length) return curr.map(b => ({ ...b, id: Math.random(), history: [{ x: b.x, y: b.y }] }));
  const alpha = smoothing;
  const maxDist = 100;
  const used = new Set<number>();
  return curr.map(c => {
    let best = -1, bestD = Infinity;
    prev.forEach((p, i) => {
      if (used.has(i)) return;
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < bestD && d < maxDist) { bestD = d; best = i; }
    });
    if (best !== -1) {
      used.add(best);
      const p = prev[best];
      const nx = alpha * c.x + (1 - alpha) * p.x;
      const ny = alpha * c.y + (1 - alpha) * p.y;
      const history = [...(p.history || []), { x: nx, y: ny }].slice(-120);
      return { ...c, x: nx, y: ny, vx: c.x - p.x, vy: c.y - p.y, id: p.id, history };
    }
    return { ...c, id: Math.random(), vx: 0, vy: 0, history: [{ x: c.x, y: c.y }] };
  });
}

function catmullRom(pts: { x: number; y: number }[], res = 8) {
  if (pts.length < 4) return pts;
  const out: { x: number; y: number }[] = [];
  for (let i = 1; i < pts.length - 2; i++) {
    const p = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
    for (let j = 0; j < res; j++) {
      const t = j / res, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * ((-p[0].x + 3 * p[1].x - 3 * p[2].x + p[3].x) * t3 + (2 * p[0].x - 5 * p[1].x + 4 * p[2].x - p[3].x) * t2 + (-p[0].x + p[2].x) * t + 2 * p[1].x),
        y: 0.5 * ((-p[0].y + 3 * p[1].y - 3 * p[2].y + p[3].y) * t3 + (2 * p[0].y - 5 * p[1].y + 4 * p[2].y - p[3].y) * t2 + (-p[0].y + p[2].y) * t + 2 * p[1].y),
      });
    }
  }
  return out;
}

function drawBoxes(ctx: CanvasRenderingContext2D, blobs: Blob[], c: MTConfig) {
  ctx.strokeStyle = hexToRgba(c.boxColor, c.boxOpacity / 100);
  ctx.lineWidth = c.boxWidth;
  blobs.forEach(b => {
    const p = c.boxPadding;
    const x = b.minX - p, y = b.minY - p;
    const w = b.width + p * 2, h = b.height + p * 2;
    if (c.boxStyle === "FULL") ctx.strokeRect(x, y, w, h);
    else if (c.boxStyle === "DASHED") {
      ctx.setLineDash([4, 4]); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
    } else {
      const arm = Math.min(w, h) * 0.3;
      ctx.beginPath(); ctx.moveTo(x, y + arm); ctx.lineTo(x, y); ctx.lineTo(x + arm, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w - arm, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + arm); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + h - arm); ctx.lineTo(x, y + h); ctx.lineTo(x + arm, y + h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w - arm, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - arm); ctx.stroke();
    }
  });
}

function drawMarkers(ctx: CanvasRenderingContext2D, blobs: Blob[], c: MTConfig) {
  ctx.strokeStyle = hexToRgba(c.markerColor, c.markerOpacity / 100);
  ctx.fillStyle = hexToRgba(c.markerColor, c.markerOpacity / 100);
  ctx.lineWidth = 1;
  const s = c.markerSize / 2;
  blobs.forEach(b => {
    if (c.markerStyle === "CROSS") {
      ctx.beginPath(); ctx.moveTo(b.x - s, b.y); ctx.lineTo(b.x + s, b.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x, b.y - s); ctx.lineTo(b.x, b.y + s); ctx.stroke();
    } else if (c.markerStyle === "RETICLE") {
      ctx.beginPath(); ctx.arc(b.x, b.y, s, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x - s, b.y); ctx.lineTo(b.x + s, b.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x, b.y - s); ctx.lineTo(b.x, b.y + s); ctx.stroke();
    } else if (c.markerStyle === "DOT") {
      ctx.beginPath(); ctx.arc(b.x, b.y, s / 2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - s); ctx.lineTo(b.x + s, b.y);
      ctx.lineTo(b.x, b.y + s); ctx.lineTo(b.x - s, b.y); ctx.closePath(); ctx.stroke();
    }
  });
}

function drawConnections(ctx: CanvasRenderingContext2D, blobs: Blob[], W: number, H: number, c: MTConfig, time: number) {
  const avg = blobs.reduce((s, b) => s + b.area, 0) / Math.max(1, blobs.length);
  const maxDist = Math.sqrt(avg) * 3 + 200;
  ctx.strokeStyle = hexToRgba(c.connectionColor, c.connectionOpacity / 100);
  ctx.lineWidth = c.connectionWidth;
  const dash = c.lineStyle === "DASHED" ? [4, 4] : [];
  if (c.animateLines) {
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = -(time * 0.01 * c.animateSpeed);
  } else {
    ctx.setLineDash(dash);
  }
  const drawLine = (ax: number, ay: number, bx: number, by: number) => {
    ctx.beginPath();
    if (c.lineStyle === "CURVED") {
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const t = c.curveTension;
      const cpx = mx + (by - ay) * t, cpy = my - (bx - ax) * t;
      ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cpx, cpy, bx, by);
    } else {
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    }
    ctx.stroke();
  };
  const hub = { x: (c.hubX / 100) * W, y: (c.hubY / 100) * H };
  switch (c.connectionMode) {
    case "ALL PAIRS":
      for (let i = 0; i < blobs.length; i++)
        for (let j = i + 1; j < blobs.length; j++)
          if (Math.hypot(blobs[i].x - blobs[j].x, blobs[i].y - blobs[j].y) < maxDist)
            drawLine(blobs[i].x, blobs[i].y, blobs[j].x, blobs[j].y);
      break;
    case "NEAREST":
      blobs.forEach((b, i) => {
        let cl: Blob | null = null, md = Infinity;
        blobs.forEach((b2, j) => { if (i === j) return; const d = Math.hypot(b.x - b2.x, b.y - b2.y); if (d < md) { md = d; cl = b2; } });
        if (cl) drawLine(b.x, b.y, (cl as Blob).x, (cl as Blob).y);
      });
      break;
    case "CHAIN":
      for (let i = 0; i < blobs.length - 1; i++) drawLine(blobs[i].x, blobs[i].y, blobs[i + 1].x, blobs[i + 1].y);
      break;
    case "HUB CENTER":
      blobs.forEach(b => drawLine(hub.x, hub.y, b.x, b.y));
      ctx.beginPath(); ctx.moveTo(hub.x - 8, hub.y); ctx.lineTo(hub.x + 8, hub.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hub.x, hub.y - 8); ctx.lineTo(hub.x, hub.y + 8); ctx.stroke();
      break;
    case "RADIAL":
      blobs.forEach((b, i) => {
        let cl: Blob | null = null, md = Infinity;
        blobs.forEach((b2, j) => { if (i === j) return; const d = Math.hypot(b.x - b2.x, b.y - b2.y); if (d < md) { md = d; cl = b2; } });
        if (cl) drawLine(b.x, b.y, (cl as Blob).x, (cl as Blob).y);
        drawLine(hub.x, hub.y, b.x, b.y);
      });
      break;
  }
  ctx.setLineDash([]); ctx.lineDashOffset = 0;
}

function drawTrail(ctx: CanvasRenderingContext2D, blobs: Blob[], c: MTConfig) {
  ctx.strokeStyle = hexToRgba(c.trailColor, c.trailOpacity / 100);
  ctx.lineWidth = c.trailWidth;
  if (c.trailMode === "SPATIAL") {
    const pts = blobs.map(b => ({ x: b.x, y: b.y }));
    if (pts.length < 2) return;
    const interp = pts.length >= 4 ? catmullRom(pts, c.lineSmooth) : pts;
    ctx.beginPath();
    ctx.moveTo(interp[0].x, interp[0].y);
    interp.forEach((p, i) => { if (i > 0) ctx.lineTo(p.x, p.y); });
    ctx.stroke();
  } else {
    blobs.forEach(b => {
      const hist = (b.history || []).slice(-c.trailLength);
      if (hist.length < 2) return;
      for (let i = 1; i < hist.length; i++) {
        const t = i / hist.length;
        const a = c.trailFade === "EXPONENTIAL" ? t * t : c.trailFade === "LINEAR" ? t : 1;
        ctx.strokeStyle = hexToRgba(c.trailColor, (c.trailOpacity / 100) * a);
        ctx.beginPath();
        ctx.moveTo(hist[i - 1].x, hist[i - 1].y);
        ctx.lineTo(hist[i].x, hist[i].y);
        ctx.stroke();
      }
    });
  }
}

function drawCircleChain(ctx: CanvasRenderingContext2D, ax: number, ay: number, c: MTConfig) {
  const rad = c.chainAngle * Math.PI / 180;
  for (let i = 0; i < c.chainCount; i++) {
    const r = c.baseRadius * Math.pow(c.sizeRatio, i);
    const cx = ax + Math.cos(rad) * c.chainSpacing * i;
    const cy = ay + Math.sin(rad) * c.chainSpacing * i;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    if (c.circleFill) { ctx.fillStyle = hexToRgba(c.circleFillColor, c.circleFillOpacity / 100); ctx.fill(); }
    if (c.circleStroke) {
      ctx.strokeStyle = hexToRgba(c.circleStrokeColor, c.circleStrokeOpacity / 100);
      ctx.lineWidth = c.circleStrokeWidth;
      ctx.stroke();
    }
  }
  if (c.showCenterDot) {
    ctx.beginPath(); ctx.arc(ax, ay, c.centerDotRadius, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(c.circleStrokeColor, c.circleStrokeOpacity / 100);
    ctx.fill();
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, W: number, H: number, c: MTConfig) {
  ctx.save();
  ctx.strokeStyle = hexToRgba("#ffffff", c.gridOpacity / 100);
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
}

function drawScanLines(ctx: CanvasRenderingContext2D, W: number, H: number, c: MTConfig) {
  ctx.save();
  ctx.globalAlpha = c.scanOpacity / 100;
  ctx.fillStyle = c.scanColor || "#000000";
  const offset = c.scanAnimate ? (Date.now() / 50) % c.scanDensity : 0;
  for (let y = offset; y < H; y += c.scanDensity) ctx.fillRect(0, y, W, 1);
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number, c: MTConfig) {
  const r = Math.max(W, H) * (c.vignetteSize / 100);
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r);
  g.addColorStop(0, "transparent");
  g.addColorStop(1, hexToRgba(c.vignetteColor || "#000000", c.vignetteIntensity / 100));
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

function drawGrain(ctx: CanvasRenderingContext2D, W: number, H: number, c: MTConfig) {
  ctx.save();
  ctx.globalAlpha = c.grainOpacity / 100;
  const sz = Math.max(1, c.grainSize);
  for (let x = 0; x < W; x += sz)
    for (let y = 0; y < H; y += sz)
      if (Math.random() < c.grainAmount / 100) {
        const v = Math.floor(Math.random() * 255);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, sz, sz);
      }
  ctx.restore();
}

function drawFrameCrosshair(ctx: CanvasRenderingContext2D, W: number, H: number, c: MTConfig) {
  ctx.save();
  ctx.strokeStyle = hexToRgba(c.crosshairColor, c.crosshairOpacity / 100);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
  if (c.tickMarks) {
    for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, H / 2 - 3); ctx.lineTo(x, H / 2 + 3); ctx.stroke(); }
    for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(W / 2 - 3, y); ctx.lineTo(W / 2 + 3, y); ctx.stroke(); }
  }
  ctx.restore();
}

function drawFrameBorder(ctx: CanvasRenderingContext2D, W: number, H: number, c: MTConfig) {
  const inset = 12;
  ctx.save();
  ctx.strokeStyle = hexToRgba(c.borderColor, c.borderOpacity / 100);
  ctx.lineWidth = c.borderWidth;
  if (c.borderStyle === "FULL") {
    ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  } else {
    const arm = 40, x = inset, y = inset, w = W - inset * 2, h = H - inset * 2;
    ctx.beginPath(); ctx.moveTo(x, y + arm); ctx.lineTo(x, y); ctx.lineTo(x + arm, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - arm, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + arm); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + h - arm); ctx.lineTo(x, y + h); ctx.lineTo(x + arm, y + h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - arm, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - arm); ctx.stroke();
  }
  ctx.restore();
}

function drawFrameText(ctx: CanvasRenderingContext2D, W: number, H: number, c: MTConfig) {
  ctx.save();
  ctx.font = `${c.frameTextSize}px "Space Mono", monospace`;
  ctx.fillStyle = hexToRgba(c.frameTextColor, c.frameTextOpacity / 100);
  const pad = 20;
  const text = c.frameText || "";
  const m = ctx.measureText(text);
  let tx = pad, ty = pad + c.frameTextSize;
  if (c.frameTextPosition === "TOP RIGHT") { tx = W - pad - m.width; ty = pad + c.frameTextSize; }
  else if (c.frameTextPosition === "BOTTOM LEFT") { tx = pad; ty = H - pad; }
  else if (c.frameTextPosition === "BOTTOM RIGHT") { tx = W - pad - m.width; ty = H - pad; }
  ctx.fillText(text, tx, ty);
  ctx.restore();
}

function drawLabels(ctx: CanvasRenderingContext2D, blobs: Blob[], c: MTConfig) {
  ctx.save();
  ctx.font = `${c.labelFontSize}px "Space Mono", monospace`;
  ctx.fillStyle = hexToRgba(c.labelColor, 1);
  blobs.forEach((b, i) => {
    let txt = "";
    if (c.labelContent === "INDEX") txt = String(i);
    else if (c.labelContent === "AREA") txt = String(Math.round(b.area));
    else if (c.labelContent === "POSITION") txt = `${(b.x).toFixed(0)},${(b.y).toFixed(0)}`;
    else if (c.labelContent === "VELOCITY") txt = (Math.hypot(b.vx, b.vy)).toFixed(1);
    else txt = c.labelText || "";
    let lx = b.minX, ly = b.minY - 4;
    if (c.labelPosition === "INSIDE TOP") { lx = b.minX + 3; ly = b.minY + c.labelFontSize; }
    else if (c.labelPosition === "AT CENTROID") { lx = b.x + 4; ly = b.y; }
    else if (c.labelPosition === "BELOW BOX") { lx = b.minX; ly = b.maxY + c.labelFontSize + 2; }
    ctx.fillText(txt, lx, ly);
  });
  ctx.restore();
}

function drawStatus(ctx: CanvasRenderingContext2D, blobs: Blob[], fps: number, H: number) {
  ctx.save();
  ctx.font = `9px "Space Mono", monospace`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(`fps: ${fps.toFixed(0)} / blobs: ${blobs.length}`, 12, H - 12);
  ctx.restore();
}

function drawMetrics(ctx: CanvasRenderingContext2D, blobs: Blob[], W: number, H: number) {
  ctx.save();
  ctx.font = `9px "Space Mono", monospace`;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  blobs.slice(0, 6).forEach((b, i) => {
    const t = `#${i} pos:${(b.x / W).toFixed(2)},${(b.y / H).toFixed(2)} v:${Math.hypot(b.vx, b.vy).toFixed(1)} a:${b.area}`;
    ctx.fillText(t, 12, 18 + i * 12);
  });
  ctx.restore();
}

// ============================================================
// Component
// ============================================================

const ASPECTS: Record<AspectId, { w: number; h: number }> = {
  "16:9": { w: 1280, h: 720 },
  "1:1": { w: 800, h: 800 },
  "4:3": { w: 1067, h: 800 },
};

function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function Pill<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-mono border ${
            value === o.id ? "bg-foreground text-background border-foreground"
            : "bg-control text-foreground border-border hover:bg-control-hover"
          }`}>{o.label}</button>
      ))}
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="w-8 h-6 bg-control border border-border cursor-pointer" />
    </div>
  );
}

export function MotionTrackPanel() {
  const [cfg, setCfg] = useState<MTConfig>(DEFAULTS);
  const [aspect, setAspect] = useState<AspectId>("16:9");
  const [videoReady, setVideoReady] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopVideo, setLoopVideo] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recDuration, setRecDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevBlobs = useRef<Blob[]>([]);
  const frameCount = useRef(0);
  const fpsRef = useRef({ frames: 0, last: performance.now(), value: 0 });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recStartRef = useRef(0);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  const set = useCallback(<K extends keyof MTConfig>(k: K, v: MTConfig[K]) =>
    setCfg(p => ({ ...p, [k]: v })), []);

  // Tracking loop
  useEffect(() => {
    const video = videoRef.current;
    const canvas = overlayRef.current;
    if (!video || !canvas) return;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const c = cfgRef.current;
      if (!video.videoWidth || !video.videoHeight) return;
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d")!;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      frameCount.current++;
      const shouldDetect = !c.frameSkip || frameCount.current % 2 === 0;
      let blobs = prevBlobs.current;
      if (shouldDetect && video.readyState >= 2) {
        try {
          const detected = detectBlobs(video, canvas, c);
          blobs = matchBlobs(detected, prevBlobs.current, c.motionSmooth);
          prevBlobs.current = blobs;
        } catch { /* ignore frame */ }
      }

      // FPS
      const now = performance.now();
      fpsRef.current.frames++;
      if (now - fpsRef.current.last >= 1000) {
        fpsRef.current.value = (fpsRef.current.frames * 1000) / (now - fpsRef.current.last);
        fpsRef.current.frames = 0;
        fpsRef.current.last = now;
      }

      // Render order
      if (c.grainEnabled) drawGrain(ctx, W, H, c);
      if (c.vignetteEnabled) drawVignette(ctx, W, H, c);
      if (c.scanEnabled) drawScanLines(ctx, W, H, c);
      if (c.gridEnabled) drawGrid(ctx, W, H, c);
      if (c.circlesEnabled) {
        const anchors = c.circleAnchor === "CANVAS CENTER"
          ? [{ x: W / 2, y: H / 2 }]
          : blobs.map(b => c.circleAnchor === "BOX CENTER"
              ? { x: b.minX + b.width / 2, y: b.minY + b.height / 2 }
              : { x: b.x, y: b.y });
        anchors.forEach(a => drawCircleChain(ctx, a.x, a.y, c));
      }
      if (c.connectionsEnabled && blobs.length > 1) drawConnections(ctx, blobs, W, H, c, now);
      if (c.trailEnabled && blobs.length >= 2) drawTrail(ctx, blobs, c);
      if (c.boxEnabled) drawBoxes(ctx, blobs, c);
      if (c.markerEnabled) drawMarkers(ctx, blobs, c);
      if (c.frameEnabled && c.crosshairEnabled) drawFrameCrosshair(ctx, W, H, c);
      if (c.frameEnabled && c.borderEnabled) drawFrameBorder(ctx, W, H, c);
      if (c.frameEnabled && c.frameTextEnabled) drawFrameText(ctx, W, H, c);
      if (c.labelsEnabled) drawLabels(ctx, blobs, c);
      if (c.metricsEnabled) drawMetrics(ctx, blobs, W, H);
      if (c.statusEnabled) drawStatus(ctx, blobs, fpsRef.current.value, H);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      prevBlobs.current = [];
      frameCount.current = 0;
    };
  }, []);

  // Cleanup webcam on unmount
  useEffect(() => () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }, []);

  // Video playback bindings
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrentTime(v.currentTime);
    const onLoaded = () => { setDuration(v.duration || 0); setVideoReady(true); };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onLoaded);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onLoaded);
    };
  }, []);

  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = playbackRate; }, [playbackRate]);
  useEffect(() => { if (videoRef.current) videoRef.current.loop = loopVideo; }, [loopVideo]);

  const startWebcam = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      v.srcObject = stream;
      v.muted = true;
      await v.play();
      setVideoReady(true);
    } catch (e) {
      console.error("Camera error:", e);
      alert("Camera access denied or unavailable.");
    }
  };

  const handleVideoUpload = (file: File) => {
    const v = videoRef.current;
    if (!v) return;
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    v.srcObject = null;
    v.src = URL.createObjectURL(file);
    v.loop = loopVideo;
    setUploadName(file.name);
    v.play().catch(() => {});
  };

  const removeUpload = () => {
    const v = videoRef.current; if (!v) return;
    v.pause(); v.removeAttribute("src"); v.load();
    setUploadName(null); setVideoReady(false); setDuration(0); setCurrentTime(0);
  };

  const switchSource = (mode: SourceMode) => {
    const v = videoRef.current;
    if (mode === "WEBCAM") {
      if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
      setUploadName(null);
    } else {
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      if (v) { v.srcObject = null; }
      setVideoReady(false);
    }
    set("sourceMode", mode);
  };

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };

  // Shift+click hub
  const onCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!e.shiftKey || !wrapperRef.current) return;
    const r = wrapperRef.current.getBoundingClientRect();
    set("hubX", Math.round(((e.clientX - r.left) / r.width) * 100));
    set("hubY", Math.round(((e.clientY - r.top) / r.height) * 100));
  };

  // Export PNG
  const exportPNG = () => {
    const canvas = overlayRef.current;
    const v = videoRef.current;
    if (!canvas || !v) return;
    const mult = cfg.exportMultiplier;
    const out = document.createElement("canvas");
    out.width = canvas.width * mult;
    out.height = canvas.height * mult;
    const ctx = out.getContext("2d")!;
    if (v.videoWidth) {
      ctx.save();
      ctx.globalAlpha = cfg.videoOpacity / 100;
      if (cfg.flipH && cfg.sourceMode === "WEBCAM") {
        ctx.translate(out.width, 0); ctx.scale(-1, 1);
      }
      try { ctx.drawImage(v, 0, 0, out.width, out.height); } catch {}
      ctx.restore();
    }
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
    out.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `brand-motion-${Date.now()}.png`; a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  // Recording
  const toggleRecord = () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    const canvas = overlayRef.current;
    if (!canvas) return;
    const stream = (canvas as HTMLCanvasElement).captureStream(cfg.recordFPS);
    let mimeType = "video/webm;codecs=vp9";
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "video/webm";
    const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: cfg.recordBitrate * 1_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `brand-motion-${Date.now()}.webm`; a.click();
      URL.revokeObjectURL(url);
      setRecording(false);
      setRecDuration(0);
    };
    rec.start();
    recorderRef.current = rec;
    recStartRef.current = performance.now();
    setRecording(true);
  };

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setRecDuration((performance.now() - recStartRef.current) / 1000), 100);
    return () => clearInterval(id);
  }, [recording]);

  const aspectDims = ASPECTS[aspect];

  return (
    <div className="flex flex-1 min-h-0">
      <aside className="w-[320px] shrink-0 border-r border-border bg-surface overflow-y-auto">
        <div className="px-4 pt-4 pb-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Motion Track</p>
        </div>

        <Section title="Source">
          <Pill<SourceMode> value={cfg.sourceMode} options={[{ id: "WEBCAM", label: "Webcam" }, { id: "UPLOAD", label: "Upload" }]} onChange={switchSource} />
          {cfg.sourceMode === "WEBCAM" ? (
            <>
              <ActionButton variant="primary" onClick={startWebcam}>▶ Start Camera</ActionButton>
              <Toggle label="Flip H" value={cfg.flipH} onChange={v => set("flipH", v)} />
              <p className="text-[10px] text-muted-foreground font-mono">
                {videoRef.current?.videoWidth ? `${videoRef.current.videoWidth} × ${videoRef.current.videoHeight}` : "1280 × 720"}
              </p>
            </>
          ) : (
            <>
              <input type="file" accept="video/mp4,video/webm,video/quicktime" id="mt-video-upload" className="hidden"
                onChange={e => e.target.files?.[0] && handleVideoUpload(e.target.files[0])} />
              <label htmlFor="mt-video-upload" className="block w-full text-center border border-dashed border-border px-4 py-5 text-[9px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground cursor-pointer">
                {uploadName ? <span className="truncate inline-block max-w-[200px] align-middle">{uploadName}</span> : "Drop video / click"}
              </label>
              {uploadName && (
                <>
                  <ActionButton onClick={removeUpload}>× Remove</ActionButton>
                  <SliderRow label="Time" value={currentTime} min={0} max={Math.max(0.1, duration)} step={0.1}
                    onChange={v => { if (videoRef.current) videoRef.current.currentTime = v; }} />
                  <div className="grid grid-cols-3 gap-2">
                    <ActionButton onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5); }}>◀◀</ActionButton>
                    <ActionButton variant="primary" onClick={togglePlay}>{playing ? "⏸" : "▶"}</ActionButton>
                    <ActionButton onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5); }}>▶▶</ActionButton>
                  </div>
                  <Pill<string> value={String(playbackRate)} options={[
                    { id: "0.25", label: "0.25×" }, { id: "0.5", label: "0.5×" },
                    { id: "1", label: "1×" }, { id: "1.5", label: "1.5×" }, { id: "2", label: "2×" },
                  ]} onChange={v => setPlaybackRate(parseFloat(v))} />
                  <Toggle label="Loop" value={loopVideo} onChange={setLoopVideo} />
                  <p className="text-[10px] text-muted-foreground font-mono text-right">{fmtTime(currentTime)} / {fmtTime(duration)}</p>
                </>
              )}
            </>
          )}
        </Section>

        <Section title="Detection">
          <SliderRow label="Threshold" value={cfg.threshold} min={0} max={255} onChange={v => set("threshold", v)} />
          <SliderRow label="Min Area" value={cfg.minArea} min={1} max={500} onChange={v => set("minArea", v)} />
          <SliderRow label="Max Area" value={cfg.maxArea} min={100} max={50000} onChange={v => set("maxArea", v)} />
          <SliderRow label="Max Blobs" value={cfg.maxBlobs} min={1} max={100} onChange={v => set("maxBlobs", v)} />
          <SliderRow label="Resolution" value={cfg.resolution} min={0.25} max={1} step={0.05} onChange={v => set("resolution", v)} format={v => `${v.toFixed(2)}×`} />
          <Toggle label="Frame Skip" value={cfg.frameSkip} onChange={v => set("frameSkip", v)} />
          <SliderRow label="Motion Smooth" value={cfg.motionSmooth} min={0} max={1} step={0.05} onChange={v => set("motionSmooth", v)} />
        </Section>

        <Section title="Tracking" defaultOpen={false}>
          <Toggle label="Box" value={cfg.boxEnabled} onChange={v => set("boxEnabled", v)} />
          <Pill<BoxStyle> value={cfg.boxStyle} options={[{ id: "BRACKET", label: "Bracket" }, { id: "FULL", label: "Full" }, { id: "DASHED", label: "Dashed" }]} onChange={v => set("boxStyle", v)} />
          <SliderRow label="Box Padding" value={cfg.boxPadding} min={-20} max={60} onChange={v => set("boxPadding", v)} />
          <SliderRow label="Line Width" value={cfg.boxWidth} min={0.5} max={6} step={0.5} onChange={v => set("boxWidth", v)} />
          <ColorRow label="Box Color" value={cfg.boxColor} onChange={v => set("boxColor", v)} />
          <SliderRow label="Box Opacity" value={cfg.boxOpacity} min={0} max={100} onChange={v => set("boxOpacity", v)} />
          <div className="border-t border-divider pt-3 space-y-3">
            <Toggle label="Crosshair Marker" value={cfg.markerEnabled} onChange={v => set("markerEnabled", v)} />
            {cfg.markerEnabled && <>
              <Pill<MarkerStyle> value={cfg.markerStyle} options={[
                { id: "CROSS", label: "Cross" }, { id: "RETICLE", label: "Reticle" },
                { id: "DOT", label: "Dot" }, { id: "DIAMOND", label: "Diamond" },
              ]} onChange={v => set("markerStyle", v)} />
              <SliderRow label="Marker Size" value={cfg.markerSize} min={10} max={80} onChange={v => set("markerSize", v)} />
              <ColorRow label="Marker Color" value={cfg.markerColor} onChange={v => set("markerColor", v)} />
              <SliderRow label="Marker Opacity" value={cfg.markerOpacity} min={0} max={100} onChange={v => set("markerOpacity", v)} />
            </>}
          </div>
        </Section>

        <Section title="Connections" defaultOpen={false}>
          <Toggle label="Connections" value={cfg.connectionsEnabled} onChange={v => set("connectionsEnabled", v)} />
          <Pill<ConnMode> value={cfg.connectionMode} options={[
            { id: "ALL PAIRS", label: "All Pairs" }, { id: "NEAREST", label: "Nearest" }, { id: "CHAIN", label: "Chain" },
            { id: "HUB CENTER", label: "Hub" }, { id: "RADIAL", label: "Radial" },
          ]} onChange={v => set("connectionMode", v)} />
          {(cfg.connectionMode === "HUB CENTER" || cfg.connectionMode === "RADIAL") && <>
            <SliderRow label="Hub X" value={cfg.hubX} min={0} max={100} onChange={v => set("hubX", v)} format={v => `${v}%`} />
            <SliderRow label="Hub Y" value={cfg.hubY} min={0} max={100} onChange={v => set("hubY", v)} format={v => `${v}%`} />
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.15em]">Shift + click canvas to set hub</p>
          </>}
          <Pill<LineStyle> value={cfg.lineStyle} options={[{ id: "STRAIGHT", label: "Straight" }, { id: "CURVED", label: "Curved" }, { id: "DASHED", label: "Dashed" }]} onChange={v => set("lineStyle", v)} />
          {cfg.lineStyle === "CURVED" && <SliderRow label="Curve Tension" value={cfg.curveTension} min={-1} max={1} step={0.1} onChange={v => set("curveTension", v)} />}
          <SliderRow label="Line Width" value={cfg.connectionWidth} min={0.5} max={6} step={0.5} onChange={v => set("connectionWidth", v)} />
          <ColorRow label="Line Color" value={cfg.connectionColor} onChange={v => set("connectionColor", v)} />
          <SliderRow label="Line Opacity" value={cfg.connectionOpacity} min={0} max={100} onChange={v => set("connectionOpacity", v)} />
          <Toggle label="Animate" value={cfg.animateLines} onChange={v => set("animateLines", v)} />
          {cfg.animateLines && <SliderRow label="Speed" value={cfg.animateSpeed} min={0.1} max={5} step={0.1} onChange={v => set("animateSpeed", v)} />}
        </Section>

        <Section title="Trail" defaultOpen={false}>
          <Toggle label="Trail" value={cfg.trailEnabled} onChange={v => set("trailEnabled", v)} />
          <Pill<TrailMode> value={cfg.trailMode} options={[{ id: "SPATIAL", label: "Spatial" }, { id: "TEMPORAL", label: "Temporal" }]} onChange={v => set("trailMode", v)} />
          {cfg.trailMode === "TEMPORAL" && <SliderRow label="Trail Length" value={cfg.trailLength} min={5} max={120} onChange={v => set("trailLength", v)} />}
          <SliderRow label="Line Smooth" value={cfg.lineSmooth} min={2} max={16} onChange={v => set("lineSmooth", v)} />
          <ColorRow label="Trail Color" value={cfg.trailColor} onChange={v => set("trailColor", v)} />
          <SliderRow label="Trail Width" value={cfg.trailWidth} min={0.5} max={8} step={0.5} onChange={v => set("trailWidth", v)} />
          <SliderRow label="Trail Opacity" value={cfg.trailOpacity} min={0} max={100} onChange={v => set("trailOpacity", v)} />
          {cfg.trailMode === "TEMPORAL" && (
            <Pill<TrailFade> value={cfg.trailFade} options={[{ id: "LINEAR", label: "Linear" }, { id: "EXPONENTIAL", label: "Exp" }, { id: "NONE", label: "None" }]} onChange={v => set("trailFade", v)} />
          )}
        </Section>

        <Section title="Circles" defaultOpen={false}>
          <Toggle label="Circles" value={cfg.circlesEnabled} onChange={v => set("circlesEnabled", v)} />
          <Pill<CircleAnchor> value={cfg.circleAnchor} options={[
            { id: "CENTROID", label: "Centroid" }, { id: "BOX CENTER", label: "Box" }, { id: "CANVAS CENTER", label: "Canvas" },
          ]} onChange={v => set("circleAnchor", v)} />
          <SliderRow label="Chain Count" value={cfg.chainCount} min={1} max={12} onChange={v => set("chainCount", v)} />
          <SliderRow label="Chain Angle" value={cfg.chainAngle} min={0} max={360} onChange={v => set("chainAngle", v)} format={v => `${v}°`} />
          <SliderRow label="Base Radius" value={cfg.baseRadius} min={20} max={400} onChange={v => set("baseRadius", v)} />
          <SliderRow label="Size Ratio" value={cfg.sizeRatio} min={0.3} max={1} step={0.01} onChange={v => set("sizeRatio", v)} />
          <SliderRow label="Spacing" value={cfg.chainSpacing} min={0} max={300} onChange={v => set("chainSpacing", v)} />
          <Toggle label="Stroke" value={cfg.circleStroke} onChange={v => set("circleStroke", v)} />
          {cfg.circleStroke && <>
            <SliderRow label="Stroke Width" value={cfg.circleStrokeWidth} min={0.5} max={6} step={0.5} onChange={v => set("circleStrokeWidth", v)} />
            <ColorRow label="Stroke Color" value={cfg.circleStrokeColor} onChange={v => set("circleStrokeColor", v)} />
            <SliderRow label="Stroke Opacity" value={cfg.circleStrokeOpacity} min={0} max={100} onChange={v => set("circleStrokeOpacity", v)} />
          </>}
          <Toggle label="Fill" value={cfg.circleFill} onChange={v => set("circleFill", v)} />
          {cfg.circleFill && <>
            <ColorRow label="Fill Color" value={cfg.circleFillColor} onChange={v => set("circleFillColor", v)} />
            <SliderRow label="Fill Opacity" value={cfg.circleFillOpacity} min={0} max={100} onChange={v => set("circleFillOpacity", v)} />
          </>}
          <Toggle label="Center Dot" value={cfg.showCenterDot} onChange={v => set("showCenterDot", v)} />
          {cfg.showCenterDot && <SliderRow label="Dot Radius" value={cfg.centerDotRadius} min={2} max={20} onChange={v => set("centerDotRadius", v)} />}
        </Section>

        <Section title="Frame" defaultOpen={false}>
          <Toggle label="Frame" value={cfg.frameEnabled} onChange={v => set("frameEnabled", v)} />
          <Toggle label="Crosshair" value={cfg.crosshairEnabled} onChange={v => set("crosshairEnabled", v)} />
          {cfg.crosshairEnabled && <>
            <SliderRow label="Opacity" value={cfg.crosshairOpacity} min={0} max={100} onChange={v => set("crosshairOpacity", v)} />
            <ColorRow label="Color" value={cfg.crosshairColor} onChange={v => set("crosshairColor", v)} />
            <Toggle label="Tick Marks" value={cfg.tickMarks} onChange={v => set("tickMarks", v)} />
          </>}
          <Toggle label="Border" value={cfg.borderEnabled} onChange={v => set("borderEnabled", v)} />
          {cfg.borderEnabled && <>
            <Pill<BorderStyle> value={cfg.borderStyle} options={[{ id: "FULL", label: "Full" }, { id: "CORNERS", label: "Corners" }]} onChange={v => set("borderStyle", v)} />
            <SliderRow label="Width" value={cfg.borderWidth} min={0.5} max={4} step={0.5} onChange={v => set("borderWidth", v)} />
            <ColorRow label="Color" value={cfg.borderColor} onChange={v => set("borderColor", v)} />
            <SliderRow label="Opacity" value={cfg.borderOpacity} min={0} max={100} onChange={v => set("borderOpacity", v)} />
          </>}
          <Toggle label="Frame Text" value={cfg.frameTextEnabled} onChange={v => set("frameTextEnabled", v)} />
          {cfg.frameTextEnabled && <>
            <input value={cfg.frameText} onChange={e => set("frameText", e.target.value)} placeholder="BRAND-001"
              className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono uppercase" />
            <select value={cfg.frameTextPosition} onChange={e => set("frameTextPosition", e.target.value as FramePos)}
              className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono">
              <option>TOP LEFT</option><option>TOP RIGHT</option><option>BOTTOM LEFT</option><option>BOTTOM RIGHT</option>
            </select>
            <SliderRow label="Font Size" value={cfg.frameTextSize} min={8} max={24} onChange={v => set("frameTextSize", v)} />
            <ColorRow label="Color" value={cfg.frameTextColor} onChange={v => set("frameTextColor", v)} />
            <SliderRow label="Opacity" value={cfg.frameTextOpacity} min={0} max={100} onChange={v => set("frameTextOpacity", v)} />
          </>}
        </Section>

        <Section title="Effects" defaultOpen={false}>
          <Toggle label="Scan Lines" value={cfg.scanEnabled} onChange={v => set("scanEnabled", v)} />
          {cfg.scanEnabled && <>
            <SliderRow label="Density" value={cfg.scanDensity} min={1} max={10} onChange={v => set("scanDensity", v)} />
            <SliderRow label="Opacity" value={cfg.scanOpacity} min={0} max={60} onChange={v => set("scanOpacity", v)} />
            <Toggle label="Animate" value={cfg.scanAnimate} onChange={v => set("scanAnimate", v)} />
          </>}
          <Toggle label="Vignette" value={cfg.vignetteEnabled} onChange={v => set("vignetteEnabled", v)} />
          {cfg.vignetteEnabled && <>
            <SliderRow label="Intensity" value={cfg.vignetteIntensity} min={0} max={100} onChange={v => set("vignetteIntensity", v)} />
            <ColorRow label="Color" value={cfg.vignetteColor} onChange={v => set("vignetteColor", v)} />
          </>}
          <Toggle label="Grain" value={cfg.grainEnabled} onChange={v => set("grainEnabled", v)} />
          {cfg.grainEnabled && <>
            <SliderRow label="Amount" value={cfg.grainAmount} min={0} max={100} onChange={v => set("grainAmount", v)} />
            <SliderRow label="Size" value={cfg.grainSize} min={1} max={4} onChange={v => set("grainSize", v)} />
            <SliderRow label="Opacity" value={cfg.grainOpacity} min={0} max={80} onChange={v => set("grainOpacity", v)} />
          </>}
        </Section>

        <Section title="Labels" defaultOpen={false}>
          <Toggle label="Labels" value={cfg.labelsEnabled} onChange={v => set("labelsEnabled", v)} />
          <select value={cfg.labelContent} onChange={e => set("labelContent", e.target.value as LabelContent)}
            className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono">
            <option>INDEX</option><option>AREA</option><option>POSITION</option><option>VELOCITY</option><option>CUSTOM</option>
          </select>
          {cfg.labelContent === "CUSTOM" && (
            <input value={cfg.labelText} onChange={e => set("labelText", e.target.value)} placeholder="Custom text"
              className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono" />
          )}
          <SliderRow label="Font Size" value={cfg.labelFontSize} min={8} max={24} onChange={v => set("labelFontSize", v)} />
          <ColorRow label="Color" value={cfg.labelColor} onChange={v => set("labelColor", v)} />
          <select value={cfg.labelPosition} onChange={e => set("labelPosition", e.target.value as LabelPos)}
            className="w-full bg-control border border-border px-3 py-2 text-[11px] font-mono">
            <option>ABOVE BOX</option><option>INSIDE TOP</option><option>AT CENTROID</option><option>BELOW BOX</option>
          </select>
        </Section>

        <Section title="Global" defaultOpen={false}>
          <SliderRow label="Video Opacity" value={cfg.videoOpacity} min={0} max={100} onChange={v => set("videoOpacity", v)} />
          <Toggle label="Grid" value={cfg.gridEnabled} onChange={v => set("gridEnabled", v)} />
          {cfg.gridEnabled && <SliderRow label="Grid Opacity" value={cfg.gridOpacity} min={0} max={100} onChange={v => set("gridOpacity", v)} />}
          <Toggle label="Metrics" value={cfg.metricsEnabled} onChange={v => set("metricsEnabled", v)} />
          <Toggle label="Status" value={cfg.statusEnabled} onChange={v => set("statusEnabled", v)} />
        </Section>

        <Section title="Export" defaultOpen={false}>
          <div className="flex items-center gap-2">
            <ActionButton variant="primary" onClick={toggleRecord}>{recording ? "■ Stop" : "● Rec"}</ActionButton>
            {recording && <span className="text-[10px] font-mono text-muted-foreground">{recDuration.toFixed(1)}s</span>}
          </div>
          <Pill<string> value={String(cfg.exportMultiplier)} options={[{ id: "1", label: "1×" }, { id: "2", label: "2×" }, { id: "3", label: "3×" }]} onChange={v => set("exportMultiplier", parseInt(v))} />
          <ActionButton onClick={exportPNG}>Export PNG</ActionButton>
          <Pill<string> value={String(cfg.recordFPS)} options={[{ id: "24", label: "24 fps" }, { id: "30", label: "30 fps" }, { id: "60", label: "60 fps" }]} onChange={v => set("recordFPS", parseInt(v))} />
          <SliderRow label="Bitrate Mbps" value={cfg.recordBitrate} min={1} max={20} onChange={v => set("recordBitrate", v)} />
        </Section>
      </aside>

      <main className="flex-1 min-w-0 bg-background flex flex-col items-center justify-center p-6 gap-3">
        <div className="flex gap-1">
          {(["16:9", "1:1", "4:3"] as AspectId[]).map(a => (
            <button key={a} onClick={() => setAspect(a)}
              className={`px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-mono border ${
                aspect === a ? "bg-foreground text-background border-foreground"
                : "bg-control text-foreground border-border hover:bg-control-hover"
              }`}>{a}</button>
          ))}
        </div>
        <div
          ref={wrapperRef}
          onClick={onCanvasClick}
          className="relative max-w-full max-h-full overflow-hidden bg-black"
          style={{
            aspectRatio: `${aspectDims.w} / ${aspectDims.h}`,
            width: "min(100%, 1100px)",
            cursor: "crosshair",
          }}
        >
          <video
            ref={videoRef}
            autoPlay playsInline muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform: cfg.flipH && cfg.sourceMode === "WEBCAM" ? "scaleX(-1)" : "none",
              opacity: cfg.videoOpacity / 100,
            }}
          />
          <canvas
            ref={overlayRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
          {!videoReady && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {cfg.sourceMode === "WEBCAM" ? "Click Start Camera" : "Upload a video"}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
