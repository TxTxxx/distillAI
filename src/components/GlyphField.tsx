import { useEffect, useRef } from "react";

export default function GlyphField({ text }: { text: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let start = performance.now();
    let width = 0,
      height = 0;
    let pointer = { x: -1000, y: -1000 };
    let seed = Array.from(text).reduce(
      (n, char) => (n * 31 + char.charCodeAt(0)) >>> 0,
      19,
    );
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const glyphs = Array.from(
      text.replace(/\s/g, "") + "世界模型行动推理证据VLAWAM",
    );
    // Two plumes originate in the two lines of the live headline. Their spread
    // grows with distance, so there is no rectangular cloud silhouette.
    const particles = Array.from({ length: 2100 }, () => {
      const x = 0.03 + Math.pow(random(), 2.6) * 0.97;
      const spread = (random() + random() + random() - 1.5) / 1.5;
      return {
        x,
        y: (random() < 0.5 ? 0.25 : 0.66) + spread * (0.075 + x * 0.52),
        size: 2.5 + random() * (4 + x * 6),
        alpha: 0.65 + random() * 0.35,
        char: glyphs[Math.floor(random() * glyphs.length)],
        phase: random() * Math.PI * 2,
      };
    });
    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);
      const progress = reduced.matches ? 1 : Math.min(1, (now - start) / 1200);
      const ease = 1 - Math.pow(1 - progress, 4);
      for (const p of particles) {
        const x = p.x * width;
        const y = height * p.y;
        const distance = Math.hypot(x - pointer.x, y - pointer.y);
        const force = reduced.matches ? 0 : Math.max(0, 1 - distance / 95) * 15;
        context.font = `${p.size}px "PingFang SC", sans-serif`;
        context.fillStyle = `rgba(16,22,29,${p.alpha * (1 - p.x * 0.45)})`;
        context.fillText(
          p.char,
          x + Math.cos(p.phase) * ((1 - ease) * 60 + force),
          y + Math.sin(p.phase) * ((1 - ease) * 25 + force),
        );
      }
      if (progress < 1) frame = requestAnimationFrame(draw);
    };
    const paint = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint();
    };
    const move = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      paint();
    };
    const leave = () => {
      pointer = { x: -1000, y: -1000 };
      paint();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    reduced.addEventListener("change", paint);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      reduced.removeEventListener("change", paint);
    };
  }, [text]);
  return <canvas className="glyph-field" ref={ref} aria-hidden="true" />;
}
