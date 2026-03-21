const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.title = 'Foro System Architecture & Workflows';

// Color palette: Deep dark tech theme
const C = {
  bg: '0D1117',         // GitHub dark bg
  bgCard: '161B22',     // Card bg
  bgCardLight: '1C2333',
  accent: '58A6FF',     // Blue accent
  accentGreen: '3FB950', // Green
  accentOrange: 'F78166', // Orange/red
  accentPurple: 'D2A8FF',
  accentYellow: 'E3B341',
  white: 'FFFFFF',
  textMuted: '8B949E',
  border: '30363D',
  tag: '21262D',
};

// Helper: slide background
function darkSlide(pres) {
  const s = pres.addSlide();
  s.background = { color: C.bg };
  return s;
}

// Helper: draw a top accent bar
function addTopBar(slide, color) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: color || C.accent },
    line: { color: color || C.accent }
  });
}

// Helper: section title
function addTitle(slide, text, y) {
  slide.addText(text, {
    x: 0.5, y: y || 0.18, w: 9, h: 0.55,
    fontSize: 28, bold: true, color: C.white,
    fontFace: 'Calibri', margin: 0
  });
}

// Helper: subtitle under title
function addSubtitle(slide, text, y) {
  slide.addText(text, {
    x: 0.5, y: y || 0.72, w: 9, h: 0.32,
    fontSize: 13, color: C.accent,
    fontFace: 'Calibri', margin: 0, italic: true
  });
}

// Helper: draw card
function addCard(slide, x, y, w, h, color) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.bgCard },
    line: { color: color || C.border, width: 1 },
    shadow: { type: 'outer', color: '000000', opacity: 0.25, blur: 6, offset: 2, angle: 135 }
  });
}

// Helper: label tag (colored pill)
function addTag(slide, text, x, y, color) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w: text.length * 0.095 + 0.22, h: 0.24,
    fill: { color: color || C.bgCardLight },
    line: { color: color || C.accent, width: 1 },
    rectRadius: 0.04
  });
  slide.addText(text, {
    x: x + 0.05, y: y + 0.02,
    w: text.length * 0.095 + 0.12, h: 0.2,
    fontSize: 9, bold: true, color: color || C.accent,
    fontFace: 'Consolas', margin: 0
  });
}

// ─────────────────────────────────────────────────────────
// SLIDE 1 — Cover
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  // Gradient-like side accent
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.5, h: 5.625, fill: { color: C.accent }, line: { color: C.accent } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 0, w: 0.12, h: 5.625, fill: { color: '1F6FEB' }, line: { color: '1F6FEB' } });

  // Main title block
  s.addText('Foro', {
    x: 1.0, y: 1.4, w: 8, h: 1.1,
    fontSize: 72, bold: true, color: C.white,
    fontFace: 'Calibri', margin: 0
  });
  s.addText('System Architecture & Workflows', {
    x: 1.0, y: 2.5, w: 8.5, h: 0.65,
    fontSize: 28, color: C.accent,
    fontFace: 'Calibri', margin: 0
  });
  s.addText('สำหรับทีม Dev  |  AI-Powered Thai Content Platform  |  test.foro.world', {
    x: 1.0, y: 3.25, w: 8.5, h: 0.4,
    fontSize: 14, color: C.textMuted,
    fontFace: 'Calibri', margin: 0
  });

  // Bottom tags
  addTag(s, 'React 19', 1.0, 4.55, C.accentGreen);
  addTag(s, 'Express.js', 2.2, 4.55, C.accentOrange);
  addTag(s, 'XAI Grok', 3.5, 4.55, C.accent);
  addTag(s, 'Tavily', 4.7, 4.55, C.accentPurple);
  addTag(s, 'Twitter API', 5.6, 4.55, C.accentYellow);
}

// ─────────────────────────────────────────────────────────
// SLIDE 2 — System Overview
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  addTopBar(s, C.accent);
  addTitle(s, 'ภาพรวมระบบ');
  addSubtitle(s, 'AI-Powered Thai Content Discovery & Generation Platform');

  // 3 layer boxes
  const layers = [
    { label: 'LAYER 1 — FRONTEND', title: 'React 19 + Vite', desc: 'SPA · React Hooks · localStorage state\nLucide icons · DOMPurify · Marked', color: C.accentGreen, x: 0.4 },
    { label: 'LAYER 2 — BACKEND PROXY', title: 'Express.js', desc: 'API key injection · CORS handling\nProxy routes: /api/twitter /api/xai /api/tavily', color: C.accent, x: 3.65 },
    { label: 'LAYER 3 — EXTERNAL APIs', title: 'Cloud Services', desc: 'XAI (Grok) · Twitter/X API\nTavily Search · twitterapi.io', color: C.accentOrange, x: 6.9 },
  ];

  layers.forEach(l => {
    addCard(s, l.x, 1.15, 2.9, 3.1, l.color);
    s.addShape(pres.shapes.RECTANGLE, { x: l.x, y: 1.15, w: 2.9, h: 0.32, fill: { color: l.color }, line: { color: l.color } });
    s.addText(l.label, { x: l.x + 0.12, y: 1.17, w: 2.7, h: 0.28, fontSize: 8, bold: true, color: C.bg, fontFace: 'Consolas', margin: 0 });
    s.addText(l.title, { x: l.x + 0.12, y: 1.6, w: 2.7, h: 0.45, fontSize: 17, bold: true, color: C.white, fontFace: 'Calibri', margin: 0 });
    s.addText(l.desc, { x: l.x + 0.12, y: 2.1, w: 2.68, h: 1.7, fontSize: 11, color: C.textMuted, fontFace: 'Calibri', margin: 0 });
  });

  // Arrows between layers
  s.addShape(pres.shapes.LINE, { x: 3.3, y: 2.65, w: 0.35, h: 0, line: { color: C.accent, width: 2, dashType: 'dash' } });
  s.addShape(pres.shapes.LINE, { x: 6.55, y: 2.65, w: 0.35, h: 0, line: { color: C.accent, width: 2, dashType: 'dash' } });
  s.addText('→', { x: 3.28, y: 2.48, w: 0.4, h: 0.35, fontSize: 18, color: C.accent, margin: 0, align: 'center' });
  s.addText('→', { x: 6.53, y: 2.48, w: 0.4, h: 0.35, fontSize: 18, color: C.accent, margin: 0, align: 'center' });

  // Security note
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 4.5, w: 9.2, h: 0.55,
    fill: { color: C.bgCard }, line: { color: C.accentYellow, width: 1 }
  });
  s.addText('🔒  หลักการ Security: API keys ทั้งหมดถูก inject ที่ server-side เท่านั้น — ไม่มี key ใดผ่านไปยัง browser โดยตรง', {
    x: 0.55, y: 4.55, w: 9.0, h: 0.45,
    fontSize: 12, color: C.accentYellow, fontFace: 'Calibri', margin: 0
  });
}

// ─────────────────────────────────────────────────────────
// SLIDE 3 — Tech Stack
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  addTopBar(s, C.accentGreen);
  addTitle(s, 'Tech Stack');

  const rows = [
    [{ text: 'Layer', options: { bold: true, color: C.white, fill: { color: '161B22' }, fontSize: 12 } }, { text: 'Technology', options: { bold: true, color: C.white, fill: { color: '161B22' }, fontSize: 12 } }],
    [{ text: 'Frontend', options: { bold: true, color: C.accentGreen, fontSize: 12 } }, { text: 'React 19.2, Vite 8, Lucide Icons, DOMPurify, Marked', options: { color: C.white, fontSize: 12 } }],
    [{ text: 'State Management', options: { bold: true, color: C.accentGreen, fontSize: 12 } }, { text: 'React Hooks + localStorage (ไม่ใช้ Redux/Zustand)', options: { color: C.white, fontSize: 12 } }],
    [{ text: 'AI SDK', options: { bold: true, color: C.accent, fontSize: 12 } }, { text: 'Vercel ai SDK v6 + @ai-sdk/xai provider + Zod schemas', options: { color: C.white, fontSize: 12 } }],
    [{ text: 'Backend', options: { bold: true, color: C.accentOrange, fontSize: 12 } }, { text: 'Express.js 4 (proxy layer only — no business logic)', options: { color: C.white, fontSize: 12 } }],
    [{ text: 'External APIs', options: { bold: true, color: C.accentPurple, fontSize: 12 } }, { text: 'XAI (Grok) API · twitterapi.io (Twitter/X) · Tavily Search API', options: { color: C.white, fontSize: 12 } }],
    [{ text: 'Build & Dev', options: { bold: true, color: C.textMuted, fontSize: 12 } }, { text: 'Vite 8 (HMR) · ESLint 9 · Node.js', options: { color: C.white, fontSize: 12 } }],
  ];

  s.addTable(rows, {
    x: 0.5, y: 0.85, w: 9.0, colW: [2.4, 6.6],
    border: { pt: 1, color: C.border },
    rowH: 0.52,
    fill: { color: C.bgCard },
    color: C.textMuted,
    fontFace: 'Calibri',
  });
}

// ─────────────────────────────────────────────────────────
// SLIDE 4 — 5 Main Features
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  addTopBar(s, C.accent);
  addTitle(s, '5 ฟีเจอร์หลัก');
  addSubtitle(s, 'Main Features Overview');

  const features = [
    { num: '01', title: 'Feed Sync + Thai Translation', desc: 'ดึง tweets จาก watchlist · แปลเป็นภาษาไทยอัตโนมัติ', color: C.accentGreen },
    { num: '02', title: 'Content Generation Pipeline', desc: '5-stage pipeline: Research → Brief → Draft → QA → Polish', color: C.accent },
    { num: '03', title: 'Research & Anti-Hallucination', desc: 'Tavily + X Search parallel · Fact sheet → Zod-validated output', color: C.accentPurple },
    { num: '04', title: 'Expert Discovery (Audience)', desc: 'AI แนะนำ 6 experts · Strict diversity + anti-hallucination rules', color: C.accentOrange },
    { num: '05', title: 'Advanced Search & AI Filter', desc: 'Thai → X advanced syntax · agentFilterFeed · Executive summary', color: C.accentYellow },
  ];

  features.forEach((f, i) => {
    const y = 1.15 + i * 0.83;
    addCard(s, 0.4, y, 9.2, 0.72, f.color);
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y, w: 0.65, h: 0.72, fill: { color: f.color }, line: { color: f.color } });
    s.addText(f.num, { x: 0.4, y: y + 0.14, w: 0.65, h: 0.44, fontSize: 20, bold: true, color: C.bg, align: 'center', fontFace: 'Calibri', margin: 0 });
    s.addText(f.title, { x: 1.2, y: y + 0.08, w: 5.0, h: 0.32, fontSize: 15, bold: true, color: C.white, fontFace: 'Calibri', margin: 0 });
    s.addText(f.desc, { x: 1.2, y: y + 0.38, w: 8.0, h: 0.26, fontSize: 11, color: C.textMuted, fontFace: 'Calibri', margin: 0 });
    addTag(s, i < 3 ? 'GrokService.js' : i === 3 ? 'discoverTopExperts()' : 'expandSearchQuery()', 6.9, y + 0.24, f.color);
  });
}

// ─────────────────────────────────────────────────────────
// SLIDE 5 — Feature 1: Feed Sync
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  addTopBar(s, C.accentGreen);
  addTitle(s, 'Feature 1 — Feed Sync & Thai Translation');
  addSubtitle(s, 'src/App.jsx  ·  src/services/GrokService.js  ·  src/services/TwitterService.js');

  // Flow steps
  const steps = [
    { step: '1', label: 'Add Handle', desc: 'User เพิ่ม\nTwitter handle' },
    { step: '2', label: 'handleSync()', desc: 'Validate\nwatchlist' },
    { step: '3', label: 'TwitterAPI.io', desc: 'Batch 15\nhandles/call' },
    { step: '4', label: 'generateGrokBatch()', desc: 'Batch 10\nposts/LLM call' },
    { step: '5', label: 'Thai Summary', desc: 'Store in\npost.summary' },
  ];

  steps.forEach((st, i) => {
    const x = 0.35 + i * 1.88;
    addCard(s, x, 1.15, 1.6, 1.4, C.accentGreen);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.15, w: 1.6, h: 0.32, fill: { color: C.accentGreen }, line: { color: C.accentGreen } });
    s.addText(st.step, { x: x, y: 1.17, w: 1.6, h: 0.28, fontSize: 12, bold: true, color: C.bg, align: 'center', fontFace: 'Consolas', margin: 0 });
    s.addText(st.label, { x: x + 0.08, y: 1.56, w: 1.46, h: 0.38, fontSize: 11, bold: true, color: C.white, fontFace: 'Calibri', margin: 0, align: 'center' });
    s.addText(st.desc, { x: x + 0.08, y: 1.94, w: 1.46, h: 0.5, fontSize: 9.5, color: C.textMuted, fontFace: 'Calibri', margin: 0, align: 'center' });
    if (i < steps.length - 1) {
      s.addText('→', { x: x + 1.6, y: 1.6, w: 0.28, h: 0.4, fontSize: 16, color: C.accentGreen, margin: 0, align: 'center' });
    }
  });

  // Details cards
  const details = [
    { label: 'API', value: 'api.twitterapi.io\n/twitter/tweet/advanced_search', color: C.accentYellow },
    { label: 'Model', value: 'grok-4-1-fast-non-reasoning\n(MODEL_NEWS_FAST)', color: C.accent },
    { label: 'Technique', value: 'Thai char detection (U+0E00–U+0E7F)\nBatch 10 posts/LLM call', color: C.accentPurple },
    { label: 'Storage', value: 'localStorage:\nforo_home_feed_v1', color: C.accentOrange },
  ];

  details.forEach((d, i) => {
    const x = 0.35 + i * 2.35;
    addCard(s, x, 2.85, 2.1, 1.2, d.color);
    s.addText(d.label, { x: x + 0.12, y: 2.9, w: 1.9, h: 0.28, fontSize: 10, bold: true, color: d.color, fontFace: 'Consolas', margin: 0 });
    s.addText(d.value, { x: x + 0.12, y: 3.22, w: 1.9, h: 0.7, fontSize: 10, color: C.white, fontFace: 'Consolas', margin: 0 });
  });

  // Progressive update note
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.35, y: 4.25, w: 9.2, h: 0.48,
    fill: { color: C.bgCard }, line: { color: C.accentGreen, width: 1 }
  });
  s.addText('⚡  Progressive UI update — สรุปแต่ละ batch ทันทีที่ Grok ตอบกลับ ไม่รอให้ครบทุก tweet ก่อน', {
    x: 0.55, y: 4.3, w: 9.0, h: 0.38,
    fontSize: 11.5, color: C.accentGreen, fontFace: 'Calibri', margin: 0
  });
}

// ─────────────────────────────────────────────────────────
// SLIDE 6 — Feature 2: Pipeline Overview
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  addTopBar(s, C.accent);
  addTitle(s, 'Feature 2 — Content Generation Pipeline');
  addSubtitle(s, 'src/services/GrokService.js  ·  src/components/CreateContent.jsx');

  s.addText('5 ขั้นตอนต่อเนื่อง — ออกแบบมาเพื่อป้องกัน Hallucination ก่อน Generate จริง', {
    x: 0.5, y: 0.92, w: 9, h: 0.3, fontSize: 12, color: C.textMuted, fontFace: 'Calibri', margin: 0
  });

  const pipeline = [
    { num: '1', title: 'Research', fn: 'researchAndPreventHallucination()', color: C.accentOrange },
    { num: '2', title: 'Content Brief', fn: 'buildContentBrief()', color: C.accentYellow },
    { num: '3', title: 'Streaming Draft', fn: 'generateStructuredContentV2()', color: C.accent },
    { num: '4', title: 'Quality Check', fn: 'evalResult validation', color: C.accentPurple },
    { num: '5', title: 'Polish', fn: 'polishThaiContent()', color: C.accentGreen },
  ];

  // Pipeline bar
  pipeline.forEach((p, i) => {
    const x = 0.4 + i * 1.84;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.35, w: 1.6, h: 1.8, fill: { color: C.bgCard }, line: { color: p.color, width: 1 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.35, w: 1.6, h: 0.35, fill: { color: p.color }, line: { color: p.color } });
    s.addText(p.num, { x, y: 1.37, w: 1.6, h: 0.31, fontSize: 16, bold: true, color: C.bg, align: 'center', fontFace: 'Calibri', margin: 0 });
    s.addText(p.title, { x: x + 0.08, y: 1.82, w: 1.46, h: 0.4, fontSize: 13, bold: true, color: C.white, fontFace: 'Calibri', margin: 0, align: 'center' });
    s.addText(p.fn, { x: x + 0.06, y: 2.25, w: 1.5, h: 0.6, fontSize: 8, color: C.textMuted, fontFace: 'Consolas', margin: 0, align: 'center' });
    if (i < pipeline.length - 1) {
      s.addText('→', { x: x + 1.6, y: 1.98, w: 0.24, h: 0.4, fontSize: 16, color: p.color, margin: 0, align: 'center' });
    }
  });

  // Input/Output labels
  s.addText('INPUT\nTopic / Source Post\nFormat · Tone · Length', {
    x: 0.4, y: 3.3, w: 2.5, h: 0.75, fontSize: 11, color: C.textMuted, fontFace: 'Calibri', margin: 0, align: 'left'
  });
  s.addShape(pres.shapes.LINE, { x: 0.4, y: 3.28, w: 9.2, h: 0, line: { color: C.border, width: 1, dashType: 'dash' } });
  s.addText('OUTPUT\nPolished Thai content\nReady to copy/publish', {
    x: 7.2, y: 3.3, w: 2.4, h: 0.75, fontSize: 11, color: C.accentGreen, fontFace: 'Calibri', margin: 0, align: 'right'
  });

  // Supported formats
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 4.22, w: 9.2, h: 0.95, fill: { color: C.bgCard }, line: { color: C.border, width: 1 } });
  s.addText('รูปแบบที่รองรับ:', { x: 0.6, y: 4.3, w: 2, h: 0.28, fontSize: 10, bold: true, color: C.accent, fontFace: 'Calibri', margin: 0 });
  const fmts = ['โพสต์โซเชียล', 'สคริปต์วิดีโอสั้น', 'SEO Blog', 'Thread/ให้ความรู้'];
  fmts.forEach((f, i) => addTag(s, f, 0.58 + i * 2.22, 4.62, C.accent));

  s.addText('โทนเสียง 7 แบบ:', { x: 0.6, y: 4.94, w: 2, h: 0.2, fontSize: 10, bold: true, color: C.accentYellow, fontFace: 'Calibri', margin: 0 });
  const tones = ['ให้ข้อมูล', 'Viral', 'ทางการ', 'เป็นกันเอง', 'ตลก', 'วิจารณ์', 'ฮาร์ดเซลล์'];
  tones.forEach((t, i) => addTag(s, t, 0.58 + i * 1.32, 5.16, C.accentYellow));
}

// ─────────────────────────────────────────────────────────
// SLIDE 7 — Stage 1: Research & Anti-Hallucination
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  addTopBar(s, C.accentOrange);
  addTitle(s, 'Stage 1 — Research & Anti-Hallucination');
  addSubtitle(s, 'researchAndPreventHallucination()  ·  GrokService.js');

  // 3 sources
  const sources = [
    { icon: '🌐', title: 'Tavily Search API', desc: 'Web results\nsearch_depth: advanced\nmax_results: 5', color: C.accent },
    { icon: '📈', title: 'X Search — Top', desc: 'High-engagement posts\nเกี่ยวกับ topic ที่ค้นหา', color: C.accentYellow },
    { icon: '🔴', title: 'X Search — Latest', desc: 'Recent posts\nNewsworthiness check', color: C.accentOrange },
  ];

  sources.forEach((src, i) => {
    addCard(s, 0.4 + i * 3.1, 1.1, 2.7, 2.0, src.color);
    s.addText(src.icon + ' ' + src.title, { x: 0.55 + i * 3.1, y: 1.22, w: 2.5, h: 0.38, fontSize: 13, bold: true, color: src.color, fontFace: 'Calibri', margin: 0 });
    s.addText(src.desc, { x: 0.55 + i * 3.1, y: 1.64, w: 2.45, h: 0.9, fontSize: 11, color: C.textMuted, fontFace: 'Calibri', margin: 0 });
    addTag(s, 'Promise.all() — parallel', 0.55 + i * 3.1, 2.7, src.color);
  });

  // Arrow down
  s.addText('↓ merge', { x: 4.3, y: 3.15, w: 1.5, h: 0.3, fontSize: 12, color: C.textMuted, align: 'center', fontFace: 'Calibri', margin: 0 });

  // factSheet output
  addCard(s, 0.4, 3.45, 9.2, 1.5, C.accentGreen);
  s.addText('📋 factSheet — Structured Output', { x: 0.6, y: 3.52, w: 5, h: 0.35, fontSize: 14, bold: true, color: C.accentGreen, fontFace: 'Calibri', margin: 0 });
  const fields = ['Verified facts', 'Market signals', 'Caveats / warnings', 'Recommended angles', 'Sources with URLs'];
  fields.forEach((f, i) => {
    s.addText('✓ ' + f, { x: 0.6 + (i % 3) * 3.1, y: 3.93 + Math.floor(i / 3) * 0.35, w: 3.0, h: 0.3, fontSize: 11, color: C.white, fontFace: 'Calibri', margin: 0 });
  });

  // Model + technique footer
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 5.07, w: 9.2, h: 0.35, fill: { color: C.bgCard }, line: { color: C.border, width: 1 } });
  s.addText('Model: grok-4-1-fast-reasoning  ·  generateObject() + Zod schema  ·  Fact caching (ป้องกัน duplicate API calls)', {
    x: 0.6, y: 5.1, w: 9.0, h: 0.28, fontSize: 10, color: C.accent, fontFace: 'Consolas', margin: 0
  });
}

// ─────────────────────────────────────────────────────────
// SLIDE 8 — Stage 2: Content Brief
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  addTopBar(s, C.accentYellow);
  addTitle(s, 'Stage 2 — Content Brief');
  addSubtitle(s, 'buildContentBrief()  ·  GrokService.js');

  // Left: explanation
  addCard(s, 0.4, 1.1, 4.4, 3.5, C.accentYellow);
  s.addText('จุดประสงค์', { x: 0.6, y: 1.22, w: 4, h: 0.35, fontSize: 14, bold: true, color: C.accentYellow, fontFace: 'Calibri', margin: 0 });
  s.addText('สร้าง outline ที่ชัดเจนก่อน generate content จริง\nช่วยให้โมเดลมี "แผน" ก่อนเขียน ลด hallucination\nและทำให้ content มีโครงสร้างที่แน่นอน', {
    x: 0.6, y: 1.62, w: 4.0, h: 0.88, fontSize: 12, color: C.white, fontFace: 'Calibri', margin: 0
  });

  s.addText('Model', { x: 0.6, y: 2.6, w: 4, h: 0.3, fontSize: 11, bold: true, color: C.accentYellow, fontFace: 'Calibri', margin: 0 });
  s.addText('grok-4-1-fast-reasoning\n(MODEL_REASONING_FAST)', { x: 0.6, y: 2.9, w: 4, h: 0.5, fontSize: 11, color: C.white, fontFace: 'Consolas', margin: 0 });

  s.addText('Technique', { x: 0.6, y: 3.5, w: 4, h: 0.3, fontSize: 11, bold: true, color: C.accentYellow, fontFace: 'Calibri', margin: 0 });
  s.addText('generateObject() + Zod schema\n→ Typed JSON output (ไม่ใช่ free-form text)', { x: 0.6, y: 3.8, w: 4, h: 0.5, fontSize: 11, color: C.white, fontFace: 'Consolas', margin: 0 });

  // Right: output fields
  addCard(s, 5.1, 1.1, 4.5, 3.5, C.accentYellow);
  s.addText('Output Fields (Zod Schema)', { x: 5.3, y: 1.22, w: 4.1, h: 0.35, fontSize: 14, bold: true, color: C.accentYellow, fontFace: 'Calibri', margin: 0 });

  const fields = [
    { name: 'mainAngle', desc: 'มุมมองหลักของ content' },
    { name: 'audience', desc: 'กลุ่มเป้าหมาย' },
    { name: 'voiceNotes', desc: 'โทนเสียงที่ควรใช้' },
    { name: 'structure', desc: 'โครงสร้าง outline' },
    { name: 'keyFacts', desc: 'ข้อเท็จจริงสำคัญ' },
  ];
  fields.forEach((f, i) => {
    s.addText(f.name, { x: 5.3, y: 1.65 + i * 0.52, w: 1.7, h: 0.3, fontSize: 11, bold: true, color: C.accentYellow, fontFace: 'Consolas', margin: 0 });
    s.addText(f.desc, { x: 7.1, y: 1.65 + i * 0.52, w: 2.3, h: 0.3, fontSize: 11, color: C.textMuted, fontFace: 'Calibri', margin: 0 });
  });

  // Footer
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 4.78, w: 9.2, h: 0.55, fill: { color: C.bgCard }, line: { color: C.border, width: 1 } });
  s.addText('Brief → ส่งต่อเป็น context ให้ Stage 3 (Streaming Draft) — โมเดลรู้ "เป้าหมาย" ก่อนเริ่มเขียน', {
    x: 0.6, y: 4.88, w: 9.0, h: 0.35, fontSize: 12, color: C.accentYellow, fontFace: 'Calibri', margin: 0
  });
}

// ─────────────────────────────────────────────────────────
// SLIDE 9 — Stage 3: Streaming Draft
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  addTopBar(s, C.accent);
  addTitle(s, 'Stage 3 — Streaming Draft');
  addSubtitle(s, 'generateStructuredContentV2()  ·  GrokService.js');

  // Left: model + technique
  addCard(s, 0.4, 1.1, 4.4, 2.3, C.accent);
  s.addText('Model & Technique', { x: 0.6, y: 1.22, w: 4.0, h: 0.35, fontSize: 14, bold: true, color: C.accent, fontFace: 'Calibri', margin: 0 });
  s.addText('grok-4-1-fast-reasoning\n(MODEL_WRITER)', { x: 0.6, y: 1.62, w: 4.0, h: 0.5, fontSize: 12, color: C.white, fontFace: 'Consolas', margin: 0 });
  s.addText('streamText()\n→ Real-time chunks ส่งตรงไปยัง UI\nผู้ใช้เห็น content ขณะ AI กำลังเขียน', { x: 0.6, y: 2.18, w: 4.0, h: 0.7, fontSize: 12, color: C.textMuted, fontFace: 'Calibri', margin: 0 });

  // Right: options
  addCard(s, 5.1, 1.1, 4.5, 2.3, C.accent);
  s.addText('ตัวเลือก Input', { x: 5.3, y: 1.22, w: 4.0, h: 0.35, fontSize: 14, bold: true, color: C.accent, fontFace: 'Calibri', margin: 0 });
  s.addText('Format  /  Tone  /  Length', { x: 5.3, y: 1.62, w: 4.0, h: 0.3, fontSize: 12, color: C.white, fontFace: 'Calibri', margin: 0 });

  s.addText('ความยาว:', { x: 5.3, y: 2.05, w: 1.2, h: 0.28, fontSize: 11, bold: true, color: C.accent, fontFace: 'Calibri', margin: 0 });
  addTag(s, 'Short <150w', 5.3, 2.38, C.accentGreen);
  addTag(s, 'Medium 350-500w', 6.7, 2.38, C.accentYellow);
  addTag(s, 'Long 700-900w+', 8.4, 2.38, C.accentOrange);

  // Streaming diagram
  addCard(s, 0.4, 3.55, 9.2, 1.35, C.accent);
  s.addText('Streaming Flow', { x: 0.6, y: 3.65, w: 3, h: 0.3, fontSize: 13, bold: true, color: C.accent, fontFace: 'Calibri', margin: 0 });
  s.addText('GrokService.generateStructuredContentV2()  →  streamText({ model, system, prompt })  →  onChunk()  →  UI setState()', {
    x: 0.6, y: 4.0, w: 8.8, h: 0.32, fontSize: 10.5, color: C.white, fontFace: 'Consolas', margin: 0
  });
  s.addText('→  ผู้ใช้เห็น content ไหลออกมาแบบ Real-time เหมือน ChatGPT', {
    x: 0.6, y: 4.38, w: 8.8, h: 0.28, fontSize: 11, color: C.accentGreen, fontFace: 'Calibri', margin: 0
  });

  // Temperature
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 5.07, w: 9.2, h: 0.35, fill: { color: C.bgCard }, line: { color: C.border, width: 1 } });
  s.addText('Temperature: 0.7 (creative draft)  ·  factSheet + brief ส่งเป็น context เพื่อ ground การเขียน', {
    x: 0.6, y: 5.1, w: 9.0, h: 0.28, fontSize: 10, color: C.textMuted, fontFace: 'Consolas', margin: 0
  });
}

// ─────────────────────────────────────────────────────────
// SLIDE 10 — Stage 4-5: QA & Polish
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  addTopBar(s, C.accentPurple);
  addTitle(s, 'Stage 4-5 — Quality Check & Polish');
  addSubtitle(s, 'evalResult validation  ·  polishThaiContent()  ·  GrokService.js');

  // Stage 4
  addCard(s, 0.4, 1.1, 4.4, 3.3, C.accentPurple);
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 1.1, w: 4.4, h: 0.35, fill: { color: C.accentPurple }, line: { color: C.accentPurple } });
  s.addText('STAGE 4 — Quality Check', { x: 0.55, y: 1.13, w: 4.1, h: 0.29, fontSize: 12, bold: true, color: C.bg, fontFace: 'Calibri', margin: 0 });
  s.addText([
    { text: 'Verify generated content against factSheet\n', options: { breakLine: false } },
    { text: '\nevalResult:', options: { bold: true, color: C.accentPurple } },
    { text: ' auto-reject/revise\nหาก facts ไม่ตรงหรือมี hallucination\n\n', options: {} },
    { text: 'Temperature:', options: { bold: true, color: C.accentPurple } },
    { text: ' 0.2 (conservative)\n\nModels: grok-4-1-fast-reasoning', options: {} },
  ], { x: 0.6, y: 1.55, w: 4.0, h: 2.6, fontSize: 11.5, color: C.white, fontFace: 'Calibri', margin: 0 });

  // Stage 5
  addCard(s, 5.1, 1.1, 4.5, 3.3, C.accentGreen);
  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 1.1, w: 4.5, h: 0.35, fill: { color: C.accentGreen }, line: { color: C.accentGreen } });
  s.addText('STAGE 5 — Polish (Thai)', { x: 5.25, y: 1.13, w: 4.1, h: 0.29, fontSize: 12, bold: true, color: C.bg, fontFace: 'Calibri', margin: 0 });
  s.addText([
    { text: 'polishThaiContent()\n\n', options: { bold: true, color: C.accentGreen } },
    { text: '✓ Strip emojis (unless allowEmoji = true)\n', options: {} },
    { text: '✓ Reduce hype words (ลดโอเวอร์)\n', options: {} },
    { text: '✓ Normalize Thai markdown formatting\n\n', options: {} },
    { text: 'Temperature:', options: { bold: true, color: C.accentGreen } },
    { text: ' 0.4 (light edits)', options: {} },
  ], { x: 5.3, y: 1.55, w: 4.1, h: 2.6, fontSize: 11.5, color: C.white, fontFace: 'Calibri', margin: 0 });

  // Footer
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 4.6, w: 9.2, h: 0.7, fill: { color: C.bgCard }, line: { color: C.accentPurple, width: 1 } });
  s.addText('Temperature Ladder:', { x: 0.6, y: 4.68, w: 2.2, h: 0.28, fontSize: 11, bold: true, color: C.accentPurple, fontFace: 'Calibri', margin: 0 });
  addTag(s, '0.2 — Verify (conservative)', 0.6, 5.0, C.accentPurple);
  addTag(s, '0.4 — Polish (light edit)', 3.5, 5.0, C.accentYellow);
  addTag(s, '0.7 — Creative draft', 6.3, 5.0, C.accent);
}

// ─────────────────────────────────────────────────────────
// SLIDE 11 — Expert Discovery
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  addTopBar(s, C.accentOrange);
  addTitle(s, 'Feature 3 — Expert Discovery (Audience Tab)');
  addSubtitle(s, 'discoverTopExperts()  ·  GrokService.js  ·  App.jsx');

  addCard(s, 0.4, 1.1, 4.4, 2.25, C.accentOrange);
  s.addText('Function & Model', { x: 0.6, y: 1.22, w: 4.0, h: 0.35, fontSize: 14, bold: true, color: C.accentOrange, fontFace: 'Calibri', margin: 0 });
  s.addText('discoverTopExperts(\n  categoryQuery,\n  excludeUsernames\n)', { x: 0.6, y: 1.65, w: 4.0, h: 0.75, fontSize: 11, color: C.white, fontFace: 'Consolas', margin: 0 });
  s.addText('Model: grok-4-1-fast-reasoning\nTechnique: generateObject() + Zod schema\n→ strict rules baked into system prompt', { x: 0.6, y: 2.45, w: 4.0, h: 0.65, fontSize: 11, color: C.textMuted, fontFace: 'Calibri', margin: 0 });

  // Rules
  addCard(s, 5.1, 1.1, 4.5, 2.25, C.accentOrange);
  s.addText('กฎการคัดเลือก (สำคัญมาก)', { x: 5.3, y: 1.22, w: 4.1, h: 0.35, fontSize: 13, bold: true, color: C.accentOrange, fontFace: 'Calibri', margin: 0 });
  const rules = [
    'Diversity — ห้ามบทบาทซ้ำเกิน 2 คนใน 6 บัญชี',
    'Red Flag Filter — ตัด Bot, spam, dead accounts',
    'Cross-Validation — เฉพาะบัญชีที่แน่ใจ 100%\n(ห้าม hallucinate username)',
    'Global bias — เน้น followers จริงระดับโลก',
  ];
  rules.forEach((r, i) => {
    s.addText('•  ' + r, { x: 5.3, y: 1.62 + i * 0.42, w: 4.1, h: 0.38, fontSize: 10.5, color: C.white, fontFace: 'Calibri', margin: 0 });
  });

  // Output
  addCard(s, 0.4, 3.5, 9.2, 0.95, C.accentOrange);
  s.addText('Output:', { x: 0.6, y: 3.6, w: 1.2, h: 0.3, fontSize: 12, bold: true, color: C.accentOrange, fontFace: 'Calibri', margin: 0 });
  s.addText('6 experts  ·  username  ·  name  ·  reasoning ภาษาไทย 1 ประโยค (สั้นๆ กระชับ น่าสนใจ)', { x: 1.8, y: 3.6, w: 7.5, h: 0.3, fontSize: 12, color: C.white, fontFace: 'Calibri', margin: 0 });
  s.addText('→  ผู้ใช้สามารถ Add to Watchlist ได้ทันทีเพื่อเริ่ม sync feed', { x: 0.6, y: 3.95, w: 9.0, h: 0.28, fontSize: 11, color: C.accentGreen, fontFace: 'Calibri', margin: 0 });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 4.6, w: 9.2, h: 0.7, fill: { color: C.bgCard }, line: { color: C.border, width: 1 } });
  s.addText('⚠️  excludeUsernames parameter — ป้องกันการแนะนำบัญชีที่ผู้ใช้เพิ่มไปแล้วใน watchlist ซ้ำ', {
    x: 0.6, y: 4.7, w: 9.0, h: 0.28, fontSize: 11, color: C.accentYellow, fontFace: 'Calibri', margin: 0
  });
  s.addText('Storage: localStorage foro_watchlist_v2  ·  State: App.jsx watchlist array', {
    x: 0.6, y: 5.0, w: 9.0, h: 0.25, fontSize: 10, color: C.textMuted, fontFace: 'Calibri', margin: 0
  });
}

// ─────────────────────────────────────────────────────────
// SLIDE 12 — Advanced Search & AI Filter
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  addTopBar(s, C.accentYellow);
  addTitle(s, 'Feature 4 — Advanced Search & AI Filter');
  addSubtitle(s, 'GrokService.js  ·  TwitterService.js  ·  App.jsx');

  const fns = [
    {
      num: '1', name: 'expandSearchQuery()', color: C.accentYellow,
      desc: 'แปลง Thai query\n→ X advanced search syntax\n(OR operators, date filters, lang:th)'
    },
    {
      num: '2', name: 'searchEverything()', color: C.accent,
      desc: 'Twitter advanced search\nvia twitterapi.io\nCursor-based pagination'
    },
    {
      num: '3', name: 'agentFilterFeed()', color: C.accentPurple,
      desc: 'AI กรองผลลัพธ์\nตาม user intent\n(ไม่ใช่แค่ keyword match)'
    },
    {
      num: '4', name: 'generateExecutiveSummary()', color: C.accentGreen,
      desc: 'สรุป 2-3 บรรทัด\nสำหรับชุดผลลัพธ์\n(เหมือน briefing note)'
    },
  ];

  fns.forEach((f, i) => {
    addCard(s, 0.35 + i * 2.35, 1.1, 2.1, 2.6, f.color);
    s.addShape(pres.shapes.RECTANGLE, { x: 0.35 + i * 2.35, y: 1.1, w: 2.1, h: 0.35, fill: { color: f.color }, line: { color: f.color } });
    s.addText(f.num, { x: 0.35 + i * 2.35, y: 1.12, w: 2.1, h: 0.31, fontSize: 14, bold: true, color: C.bg, align: 'center', fontFace: 'Calibri', margin: 0 });
    s.addText(f.name, { x: 0.48 + i * 2.35, y: 1.55, w: 1.85, h: 0.5, fontSize: 10, bold: true, color: f.color, fontFace: 'Consolas', margin: 0 });
    s.addText(f.desc, { x: 0.48 + i * 2.35, y: 2.1, w: 1.85, h: 1.35, fontSize: 10.5, color: C.textMuted, fontFace: 'Calibri', margin: 0 });
  });

  // Model & API
  s.addShape(pres.shapes.RECTANGLE, { x: 0.35, y: 3.85, w: 9.3, h: 0.65, fill: { color: C.bgCard }, line: { color: C.accentYellow, width: 1 } });
  s.addText('Model: grok-4-1-fast-non-reasoning (fast filter + summary)', { x: 0.55, y: 3.92, w: 9.0, h: 0.28, fontSize: 11, bold: true, color: C.accentYellow, fontFace: 'Calibri', margin: 0 });
  s.addText('API: api.twitterapi.io → /twitter/tweet/advanced_search  ·  queryType: Top | Latest', { x: 0.55, y: 4.2, w: 9.0, h: 0.25, fontSize: 10.5, color: C.textMuted, fontFace: 'Calibri', margin: 0 });

  // Filter options
  s.addShape(pres.shapes.RECTANGLE, { x: 0.35, y: 4.65, w: 9.3, h: 0.65, fill: { color: C.bgCard }, line: { color: C.border, width: 1 } });
  s.addText('Filter options:', { x: 0.55, y: 4.72, w: 1.8, h: 0.28, fontSize: 11, bold: true, color: C.white, fontFace: 'Calibri', margin: 0 });
  addTag(s, 'View: Top Engagement', 2.0, 4.75, C.accent);
  addTag(s, 'View: Latest', 4.5, 4.75, C.accent);
  addTag(s, 'Engagement filter', 6.4, 4.75, C.accentPurple);
  s.addText('Executive summary แสดงที่บนสุดของผลลัพธ์ — 2-3 บรรทัด AI-written briefing', { x: 0.55, y: 5.05, w: 9.0, h: 0.25, fontSize: 10.5, color: C.accentGreen, fontFace: 'Calibri', margin: 0 });
}

// ─────────────────────────────────────────────────────────
// SLIDE 13 — AI Models Reference
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  addTopBar(s, C.accent);
  addTitle(s, 'AI Models ที่ใช้งานจริง');
  addSubtitle(s, 'src/services/GrokService.js — model constants');

  const rows = [
    [
      { text: 'Constant', options: { bold: true, color: C.white, fill: { color: '1C2333' }, fontSize: 12 } },
      { text: 'Model ID', options: { bold: true, color: C.white, fill: { color: '1C2333' }, fontSize: 12 } },
      { text: 'ใช้งานใน', options: { bold: true, color: C.white, fill: { color: '1C2333' }, fontSize: 12 } },
    ],
    [
      { text: 'MODEL_NEWS_FAST', options: { bold: true, color: C.accentYellow, fontSize: 11.5 } },
      { text: 'grok-4-1-fast-non-reasoning', options: { color: C.white, fontSize: 11.5 } },
      { text: 'Feed summary · Search filter · Executive summary', options: { color: C.textMuted, fontSize: 11 } },
    ],
    [
      { text: 'MODEL_REASONING_FAST', options: { bold: true, color: C.accent, fontSize: 11.5 } },
      { text: 'grok-4-1-fast-reasoning', options: { color: C.white, fontSize: 11.5 } },
      { text: 'Content brief · Expert discovery (generateObject)', options: { color: C.textMuted, fontSize: 11 } },
    ],
    [
      { text: 'MODEL_WRITER', options: { bold: true, color: C.accentGreen, fontSize: 11.5 } },
      { text: 'grok-4-1-fast-reasoning', options: { color: C.white, fontSize: 11.5 } },
      { text: 'Streaming content draft (streamText)', options: { color: C.textMuted, fontSize: 11 } },
    ],
    [
      { text: 'MODEL_MULTI_AGENT', options: { bold: true, color: C.textMuted, fontSize: 11.5 } },
      { text: 'grok-4.20-multi-agent-0309', options: { color: C.textMuted, fontSize: 11.5 } },
      { text: '⚠️ defined แต่ไม่ได้ใช้ใน workflow ปัจจุบัน (dead code)', options: { color: C.textMuted, fontSize: 11, italic: true } },
    ],
  ];

  s.addTable(rows, {
    x: 0.5, y: 0.85, w: 9.0, colW: [2.8, 3.2, 3.0],
    border: { pt: 1, color: C.border },
    rowH: 0.62,
    fill: { color: C.bgCard },
    fontFace: 'Calibri',
  });

  // AI SDK box
  addCard(s, 0.5, 4.38, 9.0, 0.9, C.accent);
  s.addText('AI SDK (Vercel)', { x: 0.7, y: 4.48, w: 2.2, h: 0.3, fontSize: 13, bold: true, color: C.accent, fontFace: 'Calibri', margin: 0 });
  const methods = ['generateText()', 'generateObject()', 'streamText()'];
  methods.forEach((m, i) => addTag(s, m, 3.1 + i * 2.2, 4.52, C.accent));
  s.addText('Package: @ai-sdk/xai  ·  api: new xai(MODEL)  ·  Base URL: /api/xai (proxied to api.x.ai)', {
    x: 0.7, y: 4.85, w: 8.6, h: 0.28, fontSize: 10, color: C.textMuted, fontFace: 'Consolas', margin: 0
  });
}

// ─────────────────────────────────────────────────────────
// SLIDE 14 — AI Techniques
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  addTopBar(s, C.accentPurple);
  addTitle(s, 'AI Techniques ที่ใช้');

  const techniques = [
    { icon: '📦', title: 'generateObject() + Zod', desc: 'Structured/typed LLM output\nป้องกัน hallucination ด้วย schema validation', color: C.accent },
    { icon: '⚡', title: 'streamText()', desc: 'Real-time chunk streaming\nผู้ใช้เห็น content ขณะ AI กำลังเขียน', color: C.accentGreen },
    { icon: '🧠', title: 'Chain-of-thought', desc: 'ใช้กับ reasoning models\nโมเดล "คิด" ก่อน generate output', color: C.accentOrange },
    { icon: '✅', title: 'Fact Verification Loop', desc: 'Auto-reject/revise ถ้า content\nไม่ตรงกับ factSheet', color: C.accentPurple },
    { icon: '🔄', title: 'Batch Processing', desc: '10 posts/call สำหรับ translation\n15 handles/call สำหรับ Twitter fetch', color: C.accentYellow },
    { icon: '⚙️', title: 'Parallel API Calls', desc: 'Tavily + X Search พร้อมกัน\nPromise.all() ลด latency', color: C.accentOrange },
    { icon: '🌡️', title: 'Temperature Tuning', desc: '0.2 verify → 0.4 edit\n→ 0.7 creative draft', color: C.accent },
    { icon: '💾', title: 'Fact Caching', desc: 'Cache factSheet by input\nหลีกเลี่ยง duplicate API calls', color: C.accentGreen },
  ];

  techniques.forEach((t, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.35 + col * 2.35;
    const y = 1.1 + row * 2.1;
    addCard(s, x, y, 2.1, 1.9, t.color);
    s.addText(t.icon + ' ' + t.title, { x: x + 0.12, y: y + 0.12, w: 1.88, h: 0.45, fontSize: 11, bold: true, color: t.color, fontFace: 'Calibri', margin: 0 });
    s.addText(t.desc, { x: x + 0.12, y: y + 0.6, w: 1.88, h: 1.0, fontSize: 10, color: C.textMuted, fontFace: 'Calibri', margin: 0 });
  });
}

// ─────────────────────────────────────────────────────────
// SLIDE 15 — External API Architecture
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  addTopBar(s, C.accentOrange);
  addTitle(s, 'External API Architecture');
  addSubtitle(s, 'Backend Proxy Pattern — server.cjs (production)  ·  vite.config.js (development)');

  // Proxy diagram
  const proxyRoutes = [
    { path: '/api/twitter', target: 'api.twitterapi.io', inject: 'X-API-Key header', color: C.accentYellow, desc: 'Twitter/X search · User info · Thread context' },
    { path: '/api/xai', target: 'api.x.ai', inject: 'Authorization: Bearer', color: C.accent, desc: 'All LLM calls (Grok models)' },
    { path: '/api/tavily', target: 'api.tavily.com/search', inject: 'api_key in body', color: C.accentOrange, desc: 'Web search for fact-checking' },
  ];

  proxyRoutes.forEach((r, i) => {
    const y = 1.15 + i * 1.25;
    addCard(s, 0.4, y, 9.2, 1.08, r.color);
    // Browser side
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y, w: 2.2, h: 1.08, fill: { color: C.bgCardLight }, line: { color: r.color, width: 1 } });
    s.addText('Browser', { x: 0.5, y: y + 0.05, w: 2.0, h: 0.25, fontSize: 9, color: C.textMuted, fontFace: 'Calibri', margin: 0, align: 'center' });
    s.addText(r.path, { x: 0.5, y: y + 0.32, w: 2.0, h: 0.32, fontSize: 10, bold: true, color: r.color, fontFace: 'Consolas', margin: 0, align: 'center' });
    // Arrow
    s.addText('→', { x: 2.6, y: y + 0.3, w: 0.5, h: 0.4, fontSize: 16, color: r.color, margin: 0, align: 'center' });
    s.addText(r.inject, { x: 2.55, y: y + 0.68, w: 0.65, h: 0.3, fontSize: 7.5, color: C.textMuted, fontFace: 'Calibri', margin: 0, align: 'center' });
    // Proxy
    s.addShape(pres.shapes.RECTANGLE, { x: 3.1, y, w: 2.4, h: 1.08, fill: { color: C.bgCard }, line: { color: C.border, width: 1 } });
    s.addText('Express Proxy', { x: 3.2, y: y + 0.05, w: 2.2, h: 0.25, fontSize: 9, color: C.textMuted, fontFace: 'Calibri', margin: 0, align: 'center' });
    s.addText('Inject key\n+ Forward', { x: 3.2, y: y + 0.32, w: 2.2, h: 0.5, fontSize: 11, bold: true, color: r.color, fontFace: 'Calibri', margin: 0, align: 'center' });
    // Arrow 2
    s.addText('→', { x: 5.5, y: y + 0.3, w: 0.5, h: 0.4, fontSize: 16, color: r.color, margin: 0, align: 'center' });
    // External API
    s.addShape(pres.shapes.RECTANGLE, { x: 6.0, y, w: 3.6, h: 1.08, fill: { color: C.bgCardLight }, line: { color: r.color, width: 1 } });
    s.addText(r.target, { x: 6.1, y: y + 0.08, w: 3.4, h: 0.35, fontSize: 11, bold: true, color: r.color, fontFace: 'Consolas', margin: 0 });
    s.addText(r.desc, { x: 6.1, y: y + 0.48, w: 3.4, h: 0.45, fontSize: 10, color: C.textMuted, fontFace: 'Calibri', margin: 0 });
  });

  // File references
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 4.98, w: 9.2, h: 0.4, fill: { color: C.bgCard }, line: { color: C.border, width: 1 } });
  s.addText('Files:  server.cjs (production proxy)  ·  vite.config.js (dev middleware)  ·  TWITTER_API_KEY, XAI_API_KEY, TAVILY_API_KEY ใน .env', {
    x: 0.6, y: 5.02, w: 9.0, h: 0.32, fontSize: 10, color: C.textMuted, fontFace: 'Consolas', margin: 0
  });
}

// ─────────────────────────────────────────────────────────
// SLIDE 16 — Data Persistence
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  addTopBar(s, C.accentGreen);
  addTitle(s, 'Data Persistence (localStorage)');
  addSubtitle(s, 'ไม่มี database — state ทั้งหมดอยู่ใน browser localStorage');

  const rows = [
    [{ text: 'localStorage Key', options: { bold: true, color: C.white, fill: { color: '1C2333' }, fontSize: 12 } }, { text: 'เก็บข้อมูลอะไร', options: { bold: true, color: C.white, fill: { color: '1C2333' }, fontSize: 12 } }],
    [{ text: 'foro_watchlist_v2', options: { bold: true, color: C.accentGreen, fontSize: 12 } }, { text: 'รายชื่อ Twitter accounts ที่ติดตาม (watchlist)', options: { color: C.white, fontSize: 12 } }],
    [{ text: 'foro_home_feed_v1', options: { bold: true, color: C.accentGreen, fontSize: 12 } }, { text: 'Feed posts + Thai summaries จาก sync ล่าสุด', options: { color: C.white, fontSize: 12 } }],
    [{ text: 'foro_postlists_v2', options: { bold: true, color: C.accentYellow, fontSize: 12 } }, { text: 'Custom playlists — lists ของ Twitter accounts', options: { color: C.white, fontSize: 12 } }],
    [{ text: 'foro_bookmarks_v1', options: { bold: true, color: C.accent, fontSize: 12 } }, { text: 'Saved posts — แยก tabs: news / articles', options: { color: C.white, fontSize: 12 } }],
    [{ text: 'foro_read_archive_v1', options: { bold: true, color: C.textMuted, fontSize: 12 } }, { text: 'ประวัติการอ่าน (read history)', options: { color: C.white, fontSize: 12 } }],
    [{ text: 'foro_attached_source_v1', options: { bold: true, color: C.accentPurple, fontSize: 12 } }, { text: 'Source post ที่เลือกสำหรับ content generation', options: { color: C.white, fontSize: 12 } }],
  ];

  s.addTable(rows, {
    x: 0.5, y: 0.85, w: 9.0, colW: [3.2, 5.8],
    border: { pt: 1, color: C.border },
    rowH: 0.52,
    fill: { color: C.bgCard },
    fontFace: 'Consolas',
  });

  // Notes
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.78, w: 9.0, h: 0.55, fill: { color: C.bgCard }, line: { color: C.accentYellow, width: 1 } });
  s.addText('⚠️  Implication for dev: หาก localStorage เต็มหรือถูก clear → data หาย · ต้อง sync ใหม่ · ไม่มี user accounts / auth', {
    x: 0.7, y: 4.88, w: 8.6, h: 0.35, fontSize: 11, color: C.accentYellow, fontFace: 'Calibri', margin: 0
  });
}

// ─────────────────────────────────────────────────────────
// SLIDE 17 — Summary
// ─────────────────────────────────────────────────────────
{
  const s = darkSlide(pres);
  // Full-width accent
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: '0D1117' }, line: { color: '0D1117' } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.5, h: 5.625, fill: { color: C.accent }, line: { color: C.accent } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 0, w: 0.1, h: 5.625, fill: { color: '1F6FEB' }, line: { color: '1F6FEB' } });

  s.addText('Architecture Summary', { x: 1.0, y: 0.35, w: 8.5, h: 0.6, fontSize: 32, bold: true, color: C.white, fontFace: 'Calibri', margin: 0 });

  const points = [
    { icon: '⚛️', text: 'Single-Page App (React 19) + Express proxy — ไม่มี backend logic นอกจาก proxy', color: C.accent },
    { icon: '🤖', text: 'AI ทั้งหมดผ่าน XAI (Grok) — 2 active models: non-reasoning (fast) + reasoning (quality)', color: C.accentGreen },
    { icon: '🛡️', text: 'Anti-hallucination: multi-source research (Tavily + X) ก่อน generate เสมอ', color: C.accentOrange },
    { icon: '🇹🇭', text: 'Thai-first: prompts, output, และ UI ออกแบบมาสำหรับภาษาไทย 100%', color: C.accentPurple },
    { icon: '💾', text: 'Stateless: ไม่มี session/database — state ทั้งหมดอยู่ใน localStorage', color: C.accentYellow },
    { icon: '⚡', text: 'Streaming UX: content แสดงผล real-time ขณะ AI กำลัง generate (streamText)', color: C.accentGreen },
  ];

  points.forEach((p, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: 1.0, y: 1.1 + i * 0.7, w: 0.35, h: 0.48, fill: { color: p.color }, line: { color: p.color } });
    s.addText(p.icon, { x: 1.0, y: 1.1 + i * 0.7, w: 0.35, h: 0.48, fontSize: 16, align: 'center', margin: 0, color: C.bg, fontFace: 'Calibri' });
    s.addText(p.text, { x: 1.5, y: 1.12 + i * 0.7, w: 8.0, h: 0.44, fontSize: 13, color: C.white, fontFace: 'Calibri', margin: 0 });
  });

  s.addText('test.foro.world  ·  2026', { x: 1.0, y: 5.2, w: 8.5, h: 0.3, fontSize: 11, color: C.textMuted, fontFace: 'Calibri', margin: 0 });
}

// ─────────────────────────────────────────────────────────
pres.writeFile({ fileName: "D:/TEST/Foro_System_Architecture.pptx" });
console.log("✅ Saved: D:/TEST/Foro_System_Architecture.pptx");
