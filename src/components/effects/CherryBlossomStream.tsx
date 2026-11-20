'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Petal {
  x: number;
  y: number;
  size: number;
  speedY: number;
  swayAmount: number;
  swaySpeed: number;
  swayPhase: number;
  rotation: number;
  rotationSpeed: number;
  flip: number;
  flipSpeed: number;
  opacity: number;
  colorType: 'cherry' | 'blush' | 'roseGold';
  layer: 'bg' | 'fg';
}

export default function CherryBlossomStream({
  count = 36,
  interactive = true,
}: {
  count?: number;
  interactive?: boolean;
}) {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    if (!bgCanvas || !fgCanvas) return;

    const ctxBg = bgCanvas.getContext('2d');
    const ctxFg = fgCanvas.getContext('2d');
    if (!ctxBg || !ctxFg) return;

    let animationFrameId: number;
    let width = (bgCanvas.width = fgCanvas.width = window.innerWidth);
    let height = (bgCanvas.height = fgCanvas.height = window.innerHeight);

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;

      [bgCanvas, fgCanvas].forEach((canvas) => {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      });

      ctxBg.setTransform(1, 0, 0, 1, 0, 0);
      ctxFg.setTransform(1, 0, 0, 1, 0, 0);
      ctxBg.scale(dpr, dpr);
      ctxFg.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const isMobileInitial = width < 640;
    // Calibrated speed factor: balanced floating speed matching Flutter app (neither rushing nor sluggish)
    const getSpeedFactor = (w: number) => (w < 640 ? 0.78 : 0.95);

    // Color palettes matching FLOMIRA's mobile app:
    // Color(0xFFFFB7C5), Color(0xFFFFF0F5), Color(0xFFFFFAFC)
    const palettes = {
      cherry: {
        inner: 'rgba(255, 250, 252, ',
        mid: 'rgba(255, 240, 245, ',
        outer: 'rgba(255, 183, 197, ',
        stroke: 'rgba(255, 159, 184, ',
      },
      blush: {
        inner: 'rgba(255, 255, 255, ',
        mid: 'rgba(255, 235, 240, ',
        outer: 'rgba(232, 160, 176, ',
        stroke: 'rgba(209, 137, 153, ',
      },
      roseGold: {
        inner: 'rgba(255, 248, 242, ',
        mid: 'rgba(246, 207, 214, ',
        outer: 'rgba(201, 154, 128, ',
        stroke: 'rgba(183, 110, 121, ',
      },
    };

    // Initialize petals with multi-depth 3D distribution:
    // ~28% in foreground (drifting in front of contact cards), ~72% in background (behind content)
    const petals: Petal[] = Array.from({ length: count }, (_, index) => {
      const isForeground = index % 3 === 0;
      const speedFactor = getSpeedFactor(width);

      const size = isForeground
        ? (isMobileInitial ? 0.95 : 1.15) + Math.random() * (isMobileInitial ? 0.4 : 0.5)
        : (isMobileInitial ? 0.38 : 0.45) + Math.random() * (isMobileInitial ? 0.38 : 0.45);

      const baseSpeed = isForeground
        ? 1.05 + Math.random() * 0.65
        : 0.75 + Math.random() * 0.55;

      const speedY = baseSpeed * speedFactor;

      const colorTypes: Petal['colorType'][] = ['cherry', 'cherry', 'blush', 'roseGold'];
      const colorType = colorTypes[Math.floor(Math.random() * colorTypes.length)];

      return {
        x: Math.random() * width,
        y: Math.random() * (height + 120) - 60,
        size,
        speedY,
        swayAmount: isForeground
          ? (isMobileInitial ? 20 : 28) + Math.random() * (isMobileInitial ? 18 : 22)
          : (isMobileInitial ? 14 : 20) + Math.random() * (isMobileInitial ? 14 : 18),
        swaySpeed: 1.0 + Math.random() * 0.9,
        swayPhase: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.032,
        flip: Math.random() * Math.PI * 2,
        flipSpeed: 0.018 + Math.random() * 0.024,
        opacity: isForeground ? 0.88 + Math.random() * 0.12 : 0.38 + Math.random() * 0.32,
        colorType,
        layer: isForeground ? 'fg' : 'bg',
      };
    });

    let lastTime = performance.now();

    const drawPetalPath = (
      context: CanvasRenderingContext2D,
      size: number,
      flip: number,
      opacity: number,
      palette: typeof palettes.cherry,
      isFg: boolean
    ) => {
      context.save();
      // 3D tumble flip factor
      context.scale(size * Math.cos(flip), size);

      // Foreground petals cast a subtle soft ambient shadow over the cards for 3D realism
      if (isFg) {
        context.shadowColor = 'rgba(0, 0, 0, 0.35)';
        context.shadowBlur = 6;
        context.shadowOffsetY = 3;
      }

      // Three-stop radial gradient matching Flutter's RadialGradient
      const grad = context.createRadialGradient(0, -9, 0, 0, -9, 18);
      grad.addColorStop(0, `${palette.inner}${0.95 * opacity})`);
      grad.addColorStop(0.5, `${palette.mid}${0.88 * opacity})`);
      grad.addColorStop(1, `${palette.outer}${0.96 * opacity})`);

      context.fillStyle = grad;
      context.beginPath();

      // Canonical cherry blossom petal curve with notched tip (from flomira Flutter app)
      context.moveTo(0, 0);
      context.bezierCurveTo(8, -8, 6, -15, 3, -18);
      context.bezierCurveTo(1.5, -19, -1.5, -19, -3, -18);
      context.bezierCurveTo(-6, -15, -8, -8, 0, 0);
      context.closePath();
      context.fill();

      // Delicate translucent edge highlight contour
      context.strokeStyle = `${palette.stroke}${0.6 * opacity})`;
      context.lineWidth = isFg ? 0.65 : 0.45;
      context.stroke();

      context.restore();
    };

    const render = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctxBg.clearRect(0, 0, width, height);
      ctxFg.clearRect(0, 0, width, height);

      const currentSpeedFactor = getSpeedFactor(width);

      for (let i = 0; i < petals.length; i++) {
        const petal = petals[i];
        const isFg = petal.layer === 'fg';
        const targetCtx = isFg ? ctxFg : ctxBg;

        // Graceful motion increments
        petal.y += petal.speedY * 60 * delta;
        petal.swayPhase += petal.swaySpeed * delta;
        petal.rotation += petal.rotationSpeed * 60 * delta;
        petal.flip += petal.flipSpeed * 60 * delta;

        const currentX = petal.x + Math.sin(petal.swayPhase) * petal.swayAmount;

        // Vertical fade in / out at screen borders
        let edgeOpacity = 1.0;
        if (petal.y < 50) {
          edgeOpacity = Math.max(0, petal.y / 50);
        } else if (petal.y > height - 60) {
          edgeOpacity = Math.max(0, (height - petal.y) / 60);
        }

        const finalOpacity = petal.opacity * edgeOpacity;

        if (finalOpacity > 0.01) {
          targetCtx.save();
          targetCtx.translate(currentX, petal.y);
          targetCtx.rotate(petal.rotation);

          drawPetalPath(targetCtx, petal.size, petal.flip, finalOpacity, palettes[petal.colorType], isFg);
          targetCtx.restore();
        }

        // Seamless recycle when petal drifts past the bottom of the viewport
        if (petal.y > height + 45) {
          petal.y = -35;
          petal.x = Math.random() * width;
          petal.swayPhase = Math.random() * Math.PI * 2;
          // Refresh speed with current factor for responsive orientation changes
          const baseSpeed = isFg ? 1.05 + Math.random() * 0.65 : 0.75 + Math.random() * 0.55;
          petal.speedY = baseSpeed * currentSpeedFactor;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, count]);

  return (
    <>
      {enabled && (
        <>
          {/* Background Layer: Petals floating BEHIND the cards & content */}
          <canvas
            ref={bgCanvasRef}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0 h-full w-full"
          />

          {/* Foreground Layer: Petals floating IN FRONT of the cards & options (3D depth) */}
          <canvas
            ref={fgCanvasRef}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-20 h-full w-full"
          />
        </>
      )}

      {/* Floating subtle ambient toggle button */}
      {interactive && (
        <button
          onClick={() => setEnabled((prev) => !prev)}
          className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-[11px] font-medium text-[#C4B5A8] hover:text-[#F6EDE4] backdrop-blur-md transition-all duration-200 active:scale-95 shadow-sm"
          title={enabled ? 'Pause falling petals' : 'Enable falling petals'}
          aria-label={enabled ? 'Pause falling cherry blossoms' : 'Enable falling cherry blossoms'}
        >
          <span className="text-sm">{enabled ? '🌸' : '🍂'}</span>
          <span className="hidden sm:inline">{enabled ? 'Blossoms' : 'Petals Paused'}</span>
        </button>
      )}
    </>
  );
}
