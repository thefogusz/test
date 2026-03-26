import { useEffect, useRef } from 'react';

export default function HomeCanvas() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const clickRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width, height;
    const particles = [];
    const COUNT = 60;
    const MAX_DIST = 140;
    const MOUSE_R = 130;

    function resize() {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    }

    function spawn(x, y) {
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

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const click = clickRef.current;

      particles.forEach(p => {
        // Mouse gravity
        const dx = mx - p.x, dy = my - p.y;
        const d = Math.hypot(dx, dy);
        if (d < MOUSE_R && d > 0) {
          const f = ((MOUSE_R - d) / MOUSE_R) * 0.025;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }

        // Click ripple burst
        if (click) {
          const cdx = click.x - p.x, cdy = click.y - p.y;
          const cd = Math.hypot(cdx, cdy);
          if (cd < 200 && cd > 0) {
            const bf = ((200 - cd) / 200) * 2.5;
            p.vx -= (cdx / cd) * bf;
            p.vy -= (cdy / cd) * bf;
          }
        }

        // Dampen
        p.vx *= 0.985;
        p.vy *= 0.985;

        // Speed cap
        const spd = Math.hypot(p.vx, p.vy);
        if (spd > 1.8) { p.vx = (p.vx / spd) * 1.8; p.vy = (p.vy / spd) * 1.8; }

        p.x += p.vx; p.y += p.vy;

        // Soft wrap
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;
      });

      clickRef.current = null;

      // Connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
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

      // Particles
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

      animRef.current = requestAnimationFrame(draw);
    }

    resize();
    init();
    draw();

    const onResize = () => { resize(); };
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };
    const onClick = (e) => {
      const r = canvas.getBoundingClientRect();
      clickRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    window.addEventListener('resize', onResize);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
}
