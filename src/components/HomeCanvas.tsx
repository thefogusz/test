import { useEffect, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  opacity: number;
};

const OFFSCREEN_POINTER = { x: -9999, y: -9999 };

export default function HomeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const mouseRef = useRef(OFFSCREEN_POINTER);
  const clickRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let isAnimating = false;
    let interactionsAttached = false;
    const particles: Particle[] = [];
    const COUNT = 60;
    const MAX_DIST = 140;
    const MOUSE_R = 130;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function resize() {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    }

    function spawn(x?: number, y?: number): Particle {
      return {
        x: x ?? Math.random() * width,
        y: y ?? Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.4 + 0.8,
        hue: [210, 230, 250, 265][Math.floor(Math.random() * 4)],
        opacity: Math.random() * 0.4 + 0.35,
      };
    }

    function init() {
      particles.length = 0;
      for (let i = 0; i < COUNT; i++) particles.push(spawn());
    }

    function draw(advanceParticles: boolean) {
      ctx.clearRect(0, 0, width, height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const click = advanceParticles ? clickRef.current : null;

      particles.forEach(p => {
        if (advanceParticles) {
          const dx = mx - p.x;
          const dy = my - p.y;
          const d = Math.hypot(dx, dy);
          if (d < MOUSE_R && d > 0) {
            const f = ((MOUSE_R - d) / MOUSE_R) * 0.025;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }

          if (click) {
            const cdx = click.x - p.x;
            const cdy = click.y - p.y;
            const cd = Math.hypot(cdx, cdy);
            if (cd < 200 && cd > 0) {
              const bf = ((200 - cd) / 200) * 2.5;
              p.vx -= (cdx / cd) * bf;
              p.vy -= (cdy / cd) * bf;
            }
          }

          p.vx *= 0.985;
          p.vy *= 0.985;

          const spd = Math.hypot(p.vx, p.vy);
          if (spd > 1.8) {
            p.vx = (p.vx / spd) * 1.8;
            p.vy = (p.vy / spd) * 1.8;
          }

          p.x += p.vx;
          p.y += p.vy;

          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
          if (p.y < -20) p.y = height + 20;
          if (p.y > height + 20) p.y = -20;
        }
      });

      if (advanceParticles) {
        clickRef.current = null;
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dd = Math.hypot(a.x - b.x, a.y - b.y);
          if (dd < MAX_DIST) {
            const op = (1 - dd / MAX_DIST) * 0.22;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `hsla(230,80%,70%,${op})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      particles.forEach(p => {
        const dd = Math.hypot(mx - p.x, my - p.y);
        const near = dd < 70;
        const glow = dd < 40;

        if (glow) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 20);
          g.addColorStop(0, `hsla(${p.hue},90%,70%,0.18)`);
          g.addColorStop(1, `hsla(${p.hue},90%,70%,0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, near ? p.r * 2.2 : p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},80%,72%,${near ? 1 : p.opacity})`;
        ctx.fill();
      });
    }

    function stopAnimation() {
      isAnimating = false;
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    }

    function renderFrame() {
      if (!isAnimating) return;
      draw(true);
      animRef.current = requestAnimationFrame(renderFrame);
    }

    function startAnimation() {
      if (isAnimating) return;
      isAnimating = true;
      renderFrame();
    }

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onLeave = () => {
      mouseRef.current = OFFSCREEN_POINTER;
    };
    const onClick = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      clickRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    function addInteractionListeners() {
      if (interactionsAttached) return;
      canvas.addEventListener('mousemove', onMove);
      canvas.addEventListener('mouseleave', onLeave);
      canvas.addEventListener('click', onClick);
      interactionsAttached = true;
    }

    function removeInteractionListeners() {
      if (!interactionsAttached) return;
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('click', onClick);
      interactionsAttached = false;
      mouseRef.current = OFFSCREEN_POINTER;
      clickRef.current = null;
    }

    function renderStatic() {
      stopAnimation();
      removeInteractionListeners();
      mouseRef.current = OFFSCREEN_POINTER;
      clickRef.current = null;
      draw(false);
    }

    function applyMotionPreference() {
      if (motionQuery.matches) {
        renderStatic();
      } else {
        addInteractionListeners();
        startAnimation();
      }
    }

    const onResize = () => {
      resize();
      if (motionQuery.matches) {
        init();
        renderStatic();
      }
    };
    const onMotionPreferenceChange = () => {
      applyMotionPreference();
    };

    resize();
    init();
    applyMotionPreference();

    window.addEventListener('resize', onResize);
    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', onMotionPreferenceChange);
    } else {
      motionQuery.addListener(onMotionPreferenceChange);
    }

    return () => {
      stopAnimation();
      window.removeEventListener('resize', onResize);
      if (motionQuery.removeEventListener) {
        motionQuery.removeEventListener('change', onMotionPreferenceChange);
      } else {
        motionQuery.removeListener(onMotionPreferenceChange);
      }
      removeInteractionListeners();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
}
