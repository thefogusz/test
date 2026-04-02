// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { Search, FileText, CheckCircle2, ListVideo, ShieldCheck, Copy, MessageSquare, Hash, Plus, Loader2, Info, ChevronDown, Smile, Maximize2, X, PenTool, SquarePen, Bookmark, ExternalLink, RefreshCw } from 'lucide-react';
import { researchAndPreventHallucination, generateStructuredContentV2, normalizeContentIntent } from '../services/GrokService';
import { renderMarkdownToHtml } from '../utils/markdown';
import ContentTabSwitcher from './ContentTabSwitcher';

const THINKING_PHASES = {
  researching: [
    'Researching source material...',
    'Cross-checking external references...',
    'Summarizing the key facts...',
    'Validating sources and signals...',
  ],
  briefing: [
    'Building content brief...',
    'Defining angle and structure...',
    'Locking key facts and tone...',
    'Brief ready — preparing writer...',
  ],
  generating: [
    'Drafting the content...',
    'Polishing language and flow...',
    'Improving the hook and pacing...',
    'Reviewing the final draft...',
  ],
};

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const EMOJI_REQUEST_PATTERN = /(emoji|emojis|อีโมจิ|อิโมจิ|ใส่อีโมจิ|ใส่ emoji|ใช้ emoji|ใช้ emojis)/i;

// Safe markdown parser -- prevents streaming partial-chunk crashes from killing the render tree
let _lastGoodHtml = '';
const safeMarkdown = (text) => {
  if (!text || typeof text !== 'string') return _lastGoodHtml;
  try {
    const html = renderMarkdownToHtml(text);
    _lastGoodHtml = html;
    return html;
  } catch {
    return _lastGoodHtml; // Return last known good render
  }
};

const buildAttachedTweetUrl = (sourceNode) => {
  if (!sourceNode) return '';
  if (sourceNode.url) return sourceNode.url;
  if (!sourceNode.id) return '';
  const username = sourceNode.author?.username || 'i';
  return `https://x.com/${username}/status/${sourceNode.id}`;
};

const extractUrlsFromValue = (value, depth = 0, seen = new Set()) => {
  if (!value || depth > 4) return [];
  if (typeof value === 'string') {
    return Array.from(value.match(/https?:\/\/[^\s)]+/gi) || []);
  }
  if (typeof value !== 'object') return [];
  if (seen.has(value)) return [];

  seen.add(value);

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractUrlsFromValue(item, depth + 1, seen));
  }

  return Object.values(value).flatMap((item) => extractUrlsFromValue(item, depth + 1, seen));
};

const isExternalArticleUrl = (url = '') => {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return !['x.com', 'twitter.com', 't.co'].includes(hostname);
  } catch {
    return false;
  }
};

const extractPrimarySourceUrlsFromNode = (sourceNode) =>
  Array.from(
    new Set(extractUrlsFromValue(sourceNode).filter((url) => isExternalArticleUrl(url))),
  ).slice(0, 3);

const sanitizeBookmarkSources = (sources = []) =>
  sources
    .filter((source) => source && source.url)
    .filter((source, idx, self) => idx === self.findIndex((item) => item.url === source.url))
    .map((source) => ({
      title: source.title || source.url,
      url: source.url,
    }));

const serializeAttachedSource = (sourceNode) => {
  if (!sourceNode) return null;

  return {
    id: sourceNode.id || null,
    title: sourceNode.title || '',
    text: sourceNode.text || '',
    summary: sourceNode.summary || '',
    url: buildAttachedTweetUrl(sourceNode),
    author: sourceNode.author
      ? {
          name: sourceNode.author.name || '',
          username: sourceNode.author.username || '',
          profile_image_url: sourceNode.author.profile_image_url || '',
        }
      : null,
  };
};

const buildBookmarkReferenceMarkdown = (attachedSource, sources = []) => {
  const sections = [];

  if (attachedSource?.url) {
    const attachedLabel =
      attachedSource.title ||
      attachedSource.text ||
      (attachedSource.author?.username ? `@${attachedSource.author.username}` : 'Attached source');

    sections.push([
      '---',
      '',
      '## Sources',
      '',
      `- Attached source: [${attachedLabel}](${attachedSource.url})`,
    ].join('\n'));
  }

  if (sources.length > 0) {
    const sourceLines = sources.map((source) => `- [${source.title || source.url}](${source.url})`);
    if (sections.length === 0) {
      sections.push(['---', '', '## Sources', '', ...sourceLines].join('\n'));
    } else {
      sections.push(sourceLines.join('\n'));
    }
  }

  return sections.filter(Boolean).join('\n');
};

const FORMAT_OPTIONS = [
  { id: 'โพสต์โซเชียล', title: 'โพสต์โซเชียล', icon: MessageSquare },
  { id: 'สคริปต์วิดีโอสั้น', title: 'วิดีโอสั้น / Reels', icon: ListVideo },
  { id: 'บทความ SEO / บล็อก', title: 'บทความ Blog/SEO', icon: FileText },
  { id: 'โพสต์ให้ความรู้ (Thread)', title: 'X Thread', icon: Hash },
];

const TONE_OPTIONS = ['ให้ข้อมูล/ปกติ', 'กระตือรือร้น/ไวรัล', 'ทางการ/วิชาการ', 'เป็นกันเอง/เพื่อนเล่าให้ฟัง', 'ตลก/มีอารมณ์ขัน', 'ดุดัน/วิจารณ์เชิงลึก', 'ฮาร์ดเซลล์/ขายของ'];
const LENGTH_OPTIONS = ['สั้น กระชับ', 'ขนาดกลาง (มาตรฐาน)', 'ยาว แบบเจาะลึก'];

const FORMAT_HINTS = {
  'โพสต์โซเชียล': 'เน้นข้อความอ่านลื่นไหลแบบโพสต์จริง ไม่มีหัวข้อย่อย',
  'สคริปต์วิดีโอสั้น': 'เน้นภาษาพูด ประโยคสั้นกระชับ จังหวะชัดเจน ไม่มีหัวข้อ',
  'บทความ SEO / บล็อก': 'เน้นโครงสร้างและบริบทชัดเจน ค่อยแบ่งหัวข้อเมื่อจำเป็น',
  'โพสต์ให้ความรู้ (Thread)': 'เล่าเรื่องทีละช่วงความคิด เข้าใจง่าย ไม่ยาวแบบบทความเต็ม',
};

const CustomDropdown = ({ icon, value, onChange, options, isObject }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1024px), (hover: none), (pointer: coarse)').matches;
  });
  const dropdownRef = useRef(null);
  const IconComponent = icon;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 1024px), (hover: none), (pointer: coarse)');
    const handleChange = (event) => setIsCompact(event.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const selectedTitle = isObject ? options.find(o => o.id === value)?.title : value;

  return (
    <div
      ref={dropdownRef}
      className={`custom-dropdown ${isOpen ? 'open' : ''} ${isCompact ? 'inline-menu' : 'popover-menu'}`}
      style={{ position: 'relative', display: 'inline-block', width: '100%', zIndex: isOpen ? 50 : 1 }}
    >
      <button
        className="custom-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: isOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
          border: '1px solid',
          borderColor: isOpen ? 'var(--accent-secondary)' : 'var(--glass-border)',
          borderRadius: '100px', color: '#fff',
          padding: '8px 16px', fontSize: '13px', fontWeight: '600',
          cursor: 'pointer', outline: 'none', transition: 'all 0.2s',
          fontFamily: 'inherit'
        }}
        onMouseOver={(e) => { 
          if(!isOpen) { 
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; 
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; 
          } 
        }}
        onMouseOut={(e) => { 
          if(!isOpen) { 
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; 
            e.currentTarget.style.borderColor = 'var(--glass-border)'; 
          } 
        }}
      >
        {IconComponent ? <IconComponent size={14} style={{ color: isOpen ? 'var(--accent-secondary)' : 'var(--text-dim)' }} /> : null}
        {selectedTitle}
        <ChevronDown size={14} style={{ color: 'var(--text-dim)', marginLeft: '4px', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {isOpen && (
        <div className="custom-dropdown-menu" style={{
          position: isCompact ? 'static' : 'absolute',
          top: isCompact ? 'auto' : 'calc(100% + 8px)',
          left: isCompact ? 'auto' : 0,
          background: 'var(--bg-800)', border: '1px solid var(--glass-border)',
          borderRadius: '16px', padding: isCompact ? '6px' : '8px', minWidth: isCompact ? '100%' : '220px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: '4px',
          animation: 'fadeIn 0.15s ease-out',
          marginTop: isCompact ? '8px' : 0,
          width: isCompact ? '100%' : 'max-content'
        }}>
          {options.map(opt => {
            const optValue = isObject ? opt.id : opt;
            const optTitle = isObject ? opt.title : opt;
            const OptIcon = isObject ? opt.icon : null;
            const isSelected = optValue === value;
            
            return (
              <button
                key={optValue}
                onClick={() => { onChange(optValue); setIsOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  width: '100%', padding: isCompact ? '11px 12px' : '10px 12px',
                  background: isSelected ? 'rgba(41, 151, 255, 0.1)' : 'transparent',
                  color: isSelected ? 'var(--accent-secondary)' : '#fff',
                  border: 'none', borderRadius: '8px',
                  fontSize: isCompact ? '14px' : '13px', fontWeight: isSelected ? '700' : '500',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s',
                  fontFamily: 'inherit'
                }}
                onMouseOver={(e) => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseOut={(e) => { if(!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                {OptIcon && <OptIcon size={14} />}
                {optTitle}
                {isSelected && <CheckCircle2 size={14} style={{ marginLeft: 'auto' }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  );
};

const CreateContent = ({ 
  sourceNode, 
  onRemoveSource, 
  onSaveArticle,
  isGenerating,
  setIsGenerating,
  phase,
  setPhase,
  contentTab,
  setContentTab
}) => {
  const [input, setInput] = useState(() => localStorage.getItem('foro_gen_input_v1') || '');
  
  // Settings
  const [length, setLength] = useState(() => localStorage.getItem('foro_gen_length_v1') || 'ขนาดกลาง (มาตรฐาน)');
  const [tone, setTone] = useState(() => localStorage.getItem('foro_gen_tone_v1') || 'ให้ข้อมูล/ปกติ');
  const [format, setFormat] = useState(() => localStorage.getItem('foro_gen_format_v1') || 'โพสต์โซเชียล');
  const [customInstructions, setCustomInstructions] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generation state (LIFTED TO APP.JSX)
  const [factSheet, setFactSheet] = useState(() => localStorage.getItem('foro_gen_factsheet_v1') || null);
  const [articleSources, setArticleSources] = useState(() => {
    const saved = localStorage.getItem('foro_gen_sources_v1');
    return safeParse(saved, []);
  });
  const [generatedMarkdown, setGeneratedMarkdown] = useState(() => localStorage.getItem('foro_gen_markdown_v1') || '');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [_thinkingStep, setThinkingStep] = useState(0);
  const [generationStartedAt, setGenerationStartedAt] = useState(null);
  const [progressNow, setProgressNow] = useState(() => Date.now());
  const abortRef = useRef(null);
  const activeFormatHint = FORMAT_HINTS[format] || FORMAT_HINTS['โพสต์โซเชียล'];
  useEffect(() => {
    if (!isGenerating) { setThinkingStep(0); return; }
    const steps = THINKING_PHASES[phase] || THINKING_PHASES.researching;
    const interval = setInterval(() => {
      setThinkingStep(s => (s + 1) % steps.length);
    }, 1000);
    return () => clearInterval(interval);
  }, [isGenerating, phase]);

  useEffect(() => {
    if (!isGenerating) {
      setProgressNow(Date.now());
      return;
    }

    if (!generationStartedAt) {
      setGenerationStartedAt(Date.now());
    }

    const interval = setInterval(() => {
      setProgressNow(Date.now());
    }, 200);

    return () => clearInterval(interval);
  }, [generationStartedAt, isGenerating]);

  useEffect(() => {
    if (!isGenerating) {
      setGenerationStartedAt(null);
    }
  }, [isGenerating]);

  const progressElapsedMs = generationStartedAt ? Math.max(0, progressNow - generationStartedAt) : 0;
  const _crawlDurationMs = 60000;
  const flowDurationMs = 1800;
  const flowAnimationDelay = generationStartedAt ? `-${progressElapsedMs % flowDurationMs}ms` : '0ms';

  // Persistence effects
  useEffect(() => { localStorage.setItem('foro_gen_input_v1', input); }, [input]);
  useEffect(() => { localStorage.setItem('foro_gen_length_v1', length); }, [length]);
  useEffect(() => { localStorage.setItem('foro_gen_tone_v1', tone); }, [tone]);
  useEffect(() => { localStorage.setItem('foro_gen_format_v1', format); }, [format]);
  useEffect(() => { if (factSheet) localStorage.setItem('foro_gen_factsheet_v1', factSheet); else localStorage.removeItem('foro_gen_factsheet_v1'); }, [factSheet]);
  useEffect(() => { localStorage.setItem('foro_gen_sources_v1', JSON.stringify(articleSources)); }, [articleSources]);
  useEffect(() => { localStorage.setItem('foro_gen_markdown_v1', generatedMarkdown); }, [generatedMarkdown]);

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const handleGenerate = async () => {
    const isManualInputValid = input.trim().length > 0;
    const hasSource = !!sourceNode;

    if (!isManualInputValid && !hasSource) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setGenerationStartedAt(Date.now());
    setProgressNow(Date.now());
    setFactSheet(null);
    setArticleSources([]);
    setGeneratedMarkdown('');
    setError(null);
    setPhase('researching');

    try {
      const intentProfile = await normalizeContentIntent({
        input,
        customInstructions,
        sourceContext: sourceNode?.text || sourceNode?.summary || sourceNode?.title || '',
      });

      let researchPrompt = intentProfile?.researchHint || input.trim();
      let factIntel = '';
      if (sourceNode) {
        const sourceUrl = buildAttachedTweetUrl(sourceNode);
        const primarySourceUrls = extractPrimarySourceUrlsFromNode(sourceNode);
        const originalText = (sourceNode.text || '').trim();
        const translatedSummary = (sourceNode.summary || '').trim();
        const sourceLabel = sourceNode.title || originalText || 'Untitled source';

        factIntel = [
          '[ATTACHED INTEL - ORIGINAL SOURCE]',
          `Title: ${sourceLabel}`,
          `Author: @${sourceNode.author?.username || 'Unknown'}`,
          sourceUrl ? `URL: ${sourceUrl}` : '',
          ...primarySourceUrls.map((url, index) => `Primary External URL ${index + 1}: ${url}`),
          originalText ? `Original Content: ${originalText}` : '',
          translatedSummary ? `Thai Summary (reference only, do not use as source of truth): ${translatedSummary}` : '',
        ].filter(Boolean).join('\n') + '\n\n';

        if (!researchPrompt) {
          researchPrompt = sourceUrl || originalText || sourceLabel;
        }
      }

      // 1. Research Phase
      const { factSheet: facts, sources: rawSources } = await researchAndPreventHallucination(researchPrompt, factIntel, {
        intentProfile,
        originalInput: input,
        primarySourceUrls: sourceNode ? extractPrimarySourceUrlsFromNode(sourceNode) : [],
        signal: controller.signal,
      });
      setFactSheet(facts);
      setArticleSources(rawSources || []);
      setPhase('briefing');

      // 2. Brief + Generation Phase (Streaming)
      const allowEmoji = EMOJI_REQUEST_PATTERN.test(customInstructions);
      const lengthIndex = LENGTH_OPTIONS.indexOf(length);
      const normalizedLength = lengthIndex === 0 ? 'short' : lengthIndex === 2 ? 'long' : 'medium';

      let streamStarted = false;
      await generateStructuredContentV2(
        facts,
        normalizedLength,
        tone,
        format,
        (currentText) => {
          if (!streamStarted) {
            streamStarted = true;
            setPhase('generating');
          }
          setGeneratedMarkdown(currentText);
        },
        { allowEmoji, customInstructions, intentProfile, rawUserInput: input, signal: controller.signal }
      );



      setPhase('done');
      
      // Auto-scroll to result gracefully only after it's done
      setTimeout(() => {
        const resEl = document.getElementById('content-result');
        if (resEl) resEl.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err) {
      if (err.name === 'AbortError') {
        setPhase('idle');
      } else {
        console.error('Generation Error [Detailed]:', err);
        const stage = phase === 'researching' ? 'Research' : 'Generation';
        let msg = err.message || 'Unknown Error';
        if (err.name === 'Error' && !err.message) msg = 'API Communication Error';
        setError(`${stage} Failed: ${msg}. กรุณาลองใหม่อีกครั้ง หรือสรุปข้อมูลสั้นลง`);
        setPhase('done');
      }
    } finally {
      abortRef.current = null;
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedMarkdown) return;
    navigator.clipboard.writeText(generatedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearForm = () => {
    handleStop();
    setInput('');
    setCustomInstructions('');
    setShowAdvanced(false);
    setPhase('idle');
    setGeneratedMarkdown('');
    setFactSheet(null);
    setArticleSources([]);
    setError(null);
    setIsEditing(false);
    setIsSaved(false);

    // Clear Persistence
    localStorage.removeItem('foro_gen_input_v1');
    localStorage.removeItem('foro_gen_markdown_v1');
    localStorage.removeItem('foro_gen_factsheet_v1');
    localStorage.removeItem('foro_gen_sources_v1');
    localStorage.removeItem('foro_gen_titleidea_v1');
  };

  // Regenerate: skip research phase, reuse cached factSheet
  const handleRegenerate = async () => {
    if (!factSheet || isGenerating) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setGenerationStartedAt(Date.now());
    setProgressNow(Date.now());
    setGeneratedMarkdown('');
    setError(null);
    setPhase('generating');

    try {
      const intentProfile = await normalizeContentIntent({
        input,
        customInstructions,
        sourceContext: sourceNode?.text || sourceNode?.summary || sourceNode?.title || '',
      });

      const allowEmoji = EMOJI_REQUEST_PATTERN.test(customInstructions);
      const lengthIndex = LENGTH_OPTIONS.indexOf(length);
      const normalizedLength = lengthIndex === 0 ? 'short' : lengthIndex === 2 ? 'long' : 'medium';

      await generateStructuredContentV2(
        factSheet,
        normalizedLength,
        tone,
        format,
        (currentText) => setGeneratedMarkdown(currentText),
        { allowEmoji, customInstructions, intentProfile, rawUserInput: input, signal: controller.signal },
      );



      setPhase('done');
      setTimeout(() => {
        const resEl = document.getElementById('content-result');
        if (resEl) resEl.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(`Generation Failed: ${err.message}. กรุณาลองใหม่`);
        setPhase('done');
      } else {
        setPhase('idle');
      }
    } finally {
      abortRef.current = null;
      setIsGenerating(false);
    }
  };

  return (
    <div className="create-content-shell create-content-shell-modern" style={{ padding: '0 20px 40px', maxWidth: '920px', margin: '0 auto', color: '#fff', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Compact Header */}
      <div className="create-content-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', marginTop: '10px' }}>
        <div className="create-content-header-copy">
          <h1 className="create-content-title" style={{ margin: 0, fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SquarePen size={22} strokeWidth={2.05} /> สร้างคอนเทนต์
          </h1>
          <p className="create-content-subtitle" style={{ color: 'var(--text-dim)', margin: '6px 0 0', fontSize: '14px' }}>
            เริ่มจากหัวข้อเดียว แล้วค่อยกำหนดรูปแบบ น้ำเสียง และความยาวภายหลัง
          </p>
        </div>
        {generatedMarkdown && (
          <button onClick={clearForm} className="btn-mini-ghost" style={{ padding: '8px 16px' }}>
            <Plus size={14} /> สร้างคอนเทนต์ใหม่
          </button>
        )}
      </div>
      <ContentTabSwitcher
        contentTab={contentTab}
        setContentTab={setContentTab}
        className="content-view-tabs-mobile-inline"
      />

      <div className="create-content-panel" style={{ 
        background: 'linear-gradient(180deg, rgba(22, 22, 25, 0.98), rgba(14, 14, 17, 0.98))', 
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.24)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="create-content-composer">
          <div className="create-content-main">
            {sourceNode && (
              <div className="create-content-source-pill" style={{ 
                padding: '20px 20px 0',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                animation: 'fadeIn 0.3s ease-out'
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: 0 }}>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.04)', padding: '9px', 
                    borderRadius: '12px', color: 'var(--text-dim)',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <FileText size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-dim)', letterSpacing: '0.08em', marginBottom: '4px', textTransform: 'uppercase' }}>
                      อ้างอิงจากแหล่งข้อมูล
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <img 
                        src={sourceNode.author?.profile_image_url} 
                        alt="" 
                        style={{ width: '18px', height: '18px', borderRadius: '50%' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                      <div style={{ fontSize: '13px', color: '#fff', fontWeight: '600', whiteSpace: 'nowrap' }}>@{sourceNode.author?.username}</div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sourceNode.summary || sourceNode.text}
                      </div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={onRemoveSource} 
                  className="icon-hover" 
                  style={{ 
                    padding: '8px', 
                    color: 'rgba(255,255,255,0.4)', 
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                  onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                >
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="create-content-main-label">หัวข้อ / ไอเดีย</div>
            <textarea
              className="create-content-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={sourceNode ? "อยากให้เล่าเรื่องนี้ในมุมไหน หรือมีประเด็นอะไรที่อยากเน้นเป็นพิเศษ?" : "เริ่มจากหัวข้อเดียวหรือไอเดียสั้น ๆ แล้วระบบจะช่วยต่อยอดให้"}
              disabled={isGenerating}
              style={{ 
                flex: 1, width: '100%', minHeight: sourceNode ? '240px' : '320px', resize: 'none', fontSize: '17px', lineHeight: '1.72',
                padding: sourceNode ? '10px 24px 24px' : '16px 24px 24px', background: 'transparent', border: 'none', color: '#ffffff', outline: 'none',
                fontFamily: 'inherit'
              }}
            />

            {showAdvanced && (
               <div style={{ padding: '0 20px 20px', animation: 'fadeIn 0.2s ease-out', position: 'relative' }}>
                 <input
                   className="create-content-advanced-input"
                   type="text"
                   placeholder="คำสั่งเพิ่มเติม เช่น โทนที่ต้องการ, มุมเล่าเรื่อง, ข้อห้าม"
                   value={customInstructions}
                   onChange={(e) => setCustomInstructions(e.target.value)}
                   disabled={isGenerating}
                   autoFocus
                   style={{
                     width: '100%', padding: '12px 40px 12px 16px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
                     borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s'
                   }}
                   onFocus={(e) => e.target.style.borderColor = 'var(--accent-secondary)'}
                   onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
                 />
                 <button 
                   onClick={() => { setShowAdvanced(false); setCustomInstructions(''); }}
                   style={{ position: 'absolute', right: '32px', top: '10px', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                 >
                   <X size={16} />
                 </button>
               </div>
            )}
          </div>

          <aside className="create-content-sidebar">
            <div className="create-content-sidebar-section" style={{ position: 'relative', zIndex: 10 }}>
              <div className="create-content-sidebar-label">รูปแบบงาน</div>
              <CustomDropdown icon={FileText} value={format} onChange={setFormat} options={FORMAT_OPTIONS} isObject={true} />
            </div>

            <div className="create-content-sidebar-section" style={{ position: 'relative', zIndex: 9 }}>
              <div className="create-content-sidebar-label">น้ำเสียง</div>
              <CustomDropdown icon={Smile} value={tone} onChange={setTone} options={TONE_OPTIONS} />
            </div>

            <div className="create-content-sidebar-section" style={{ position: 'relative', zIndex: 8 }}>
              <div className="create-content-sidebar-label">ความยาว</div>
              <CustomDropdown icon={Maximize2} value={length} onChange={setLength} options={LENGTH_OPTIONS} />
            </div>

            {!showAdvanced && (
              <button
                className="create-content-secondary-action"
                onClick={() => setShowAdvanced(true)}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--text-dim)',
                  fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '10px 8px', borderRadius: '12px'
                }}
              >
                <Plus size={14} /> ตัวเลือกเพิ่มเติม
              </button>
            )}

            <div className="create-content-hint">
              {activeFormatHint}
            </div>

            <div className="create-content-sidebar-actions">
              {isGenerating && (
                <button
                  className="create-content-stop-btn"
                  onClick={handleStop}
                  style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '12px', color: '#ef4444', padding: '12px 18px',
                    fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', width: '100%'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                >
                  <X size={16} /> หยุด
                </button>
              )}

              <button
                className="create-content-generate-btn"
                onClick={handleGenerate}
                disabled={isGenerating || (!input.trim() && !sourceNode)}
                style={{
                  background: (isGenerating || (!input.trim() && !sourceNode)) ? 'rgba(255,255,255,0.02)' : 'linear-gradient(180deg, #6d8dff 0%, #4f6cf7 100%)',
                  color: (isGenerating || (!input.trim() && !sourceNode)) ? 'var(--text-muted)' : '#ffffff',
                  border: (isGenerating || (!input.trim() && !sourceNode)) ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(149,177,255,0.42)',
                  borderRadius: '14px',
                  padding: '12px 22px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: (isGenerating || (!input.trim() && !sourceNode)) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: (isGenerating || (!input.trim() && !sourceNode)) ? 'none' : '0 10px 24px rgba(79, 108, 247, 0.22)',
                  transition: 'all 0.3s ease',
                  width: '100%'
                }}
              >
                {isGenerating ? (
                  <><Loader2 size={18} className="animate-spin" /> กำลังสร้าง...</>
                ) : (
                  <><SquarePen size={18} /> สร้างคอนเทนต์</>
                )}
              </button>
            </div>
          </aside>
        </div>
        
        {/* Progress Bar - indeterminate flowing animation */}
        {isGenerating && (
           <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'rgba(255,255,255,0.06)', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px', overflow: 'hidden' }}>
             <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '40%', background: 'linear-gradient(90deg, transparent, var(--accent-secondary), transparent)', animation: 'progress-flow 1.8s ease-in-out infinite', animationDelay: flowAnimationDelay }} />
           </div>
        )}
      </div>

      {/* Live streaming preview — shows raw text while streaming, avoids marked crash */}
      {isGenerating && phase === 'generating' && generatedMarkdown && (
        <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', maxHeight: '220px', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>⚡ AI กำลังเขียน...</div>
          <pre style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: '1.7', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{generatedMarkdown}</pre>
        </div>
      )}

      {/* Error Message Display */}
      {error && !isGenerating && (
        <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', animation: 'fadeIn 0.3s ease-out' }}>
          <ShieldCheck size={20} />
          <div>
            <strong>เกิดข้อผิดพลาด:</strong> {error}
          </div>
        </div>
      )}

      {/* Result Display - only parse markdown AFTER generation is fully done to prevent streaming crash */}
      {generatedMarkdown && !isGenerating && (
        <div id="content-result" className="animate-fade-in" style={{ marginTop: '32px' }}>
          <div className="content-result-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="content-result-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', margin: 0, fontWeight: '800' }}>
              <ShieldCheck className="text-accent" size={24} />
              ผลลัพธ์พร้อมใช้งาน
            </h2>
            <div className="content-result-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {factSheet && (
                <button
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="btn-pill content-result-action-btn"
                  title="สร้างเนื้อหาใหม่โดยใช้ข้อมูลเดิม ข้ามขั้นตอนค้นคว้า (เร็วกว่า)"
                  style={{ background: 'var(--bg-800)', height: '36px', padding: '0 16px', fontSize: '13px', opacity: isGenerating ? 0.5 : 1, transition: 'all 0.2s' }}
                  onMouseOver={(e) => { if (!isGenerating) e.currentTarget.style.background = 'var(--bg-700)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-800)'; }}
                >
                  <RefreshCw size={14} />
                  สร้างเวอร์ชันใหม่
                </button>
              )}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn-pill content-result-action-btn"
                style={{ background: isEditing ? 'var(--accent-secondary)' : 'var(--bg-800)', height: '36px', padding: '0 16px', fontSize: '13px', color: isEditing ? '#fff' : 'inherit', transition: 'all 0.2s' }}
              >
                <PenTool size={14} />
                {isEditing ? 'เสร็จสิ้นการแก้ไข' : 'แก้ไขเนื้อหา (Edit)'}
              </button>
              <button
                onClick={() => {
                  const attachedSource = serializeAttachedSource(sourceNode);
                  const sources = sanitizeBookmarkSources(articleSources);
                  const referenceMarkdown = buildBookmarkReferenceMarkdown(attachedSource, sources);
                  const contentToSave = [generatedMarkdown, referenceMarkdown].filter(Boolean).join('\n\n');

                  if (onSaveArticle) {
                    onSaveArticle(input.substring(0, 40) + '...', contentToSave, {
                      attachedSource,
                      sources,
                    });
                  }
                  setIsSaved(true);
                  setTimeout(() => setIsSaved(false), 2000);
                }}
                className="btn-pill content-result-action-btn"
                style={{ background: 'var(--bg-800)', height: '36px', padding: '0 16px', fontSize: '13px', color: isSaved ? '#10b981' : 'inherit', transition: 'all 0.2s' }}
              >
                {isSaved ? <CheckCircle2 size={14} color="#10b981" /> : <Bookmark size={14} />}
                {isSaved ? 'บันทึกแล้ว' : 'บันทึกลง Bookmarks'}
              </button>
              <button
                onClick={copyToClipboard}
                className="btn-pill content-result-action-btn"
                style={{ background: 'var(--bg-800)', height: '36px', padding: '0 16px', fontSize: '13px' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-700)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-800)'}
              >
                {copied ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} />}
                {copied ? 'คัดลอกสำเร็จ' : 'คัดลอกเนื้อหา'}
              </button>
            </div>
          </div>
          
          <div style={{ 
            background: 'var(--bg-800)', 
            borderRadius: '20px', 
            padding: isEditing ? '0' : '32px', 
            border: '1px solid var(--card-border)',
            boxShadow: isEditing ? '0 0 0 2px var(--accent-secondary)' : '0 12px 32px rgba(0,0,0,0.15)',
            transition: 'all 0.3s'
          }} className={isEditing ? '' : "markdown-body"}>
            {isEditing ? (
               <textarea 
                 value={generatedMarkdown}
                 onChange={(e) => setGeneratedMarkdown(e.target.value)}
                 style={{ width: '100%', minHeight: '400px', background: 'transparent', border: 'none', color: '#fff', fontSize: '15px', lineHeight: '1.7', padding: '32px', outline: 'none', resize: 'vertical' }}
               />
            ) : (
               <div dangerouslySetInnerHTML={{ __html: safeMarkdown(generatedMarkdown) }} />
            )}
          </div>
          
          {/* Native Source Cards Component */}
          {articleSources.length > 0 && (
            <div className="animate-fade-in" style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ExternalLink size={16} /> แหล่งอ้างอิงที่คัดแล้ว
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
                แสดงเฉพาะต้นทางหลักและลิงก์ยืนยันที่เกี่ยวข้องกับเรื่องนี้มากที่สุด เพื่อลดลิงก์นอกประเด็น
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {articleSources
                  .filter(s => s && s.url) // Hardening filter
                  .filter((s, idx, self) => idx === self.findIndex(t => t.url === s.url))
                  .map((source, idx) => {
                  let hostname = source.url;
                  try { hostname = new URL(source.url).hostname.replace('www.', ''); } catch { hostname = source.url; }
                  return (
                  <a key={idx} href={source.url} target="_blank" rel="noopener noreferrer" 
                     style={{ display: 'flex', flexDirection: 'column', padding: '16px', background: 'var(--bg-900)', border: '1px solid var(--card-border)', borderRadius: '12px', textDecoration: 'none', transition: 'all 0.2s', color: '#fff' }}
                     onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent-secondary)'; e.currentTarget.style.background = 'rgba(41, 151, 255, 0.05)'; }}
                     onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.background = 'var(--bg-900)'; }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                      {source.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto', fontWeight: '600' }}>
                      <ExternalLink size={12} /> {hostname}
                    </div>
                  </a>
                )})}
              </div>
            </div>
          )}

          {/* Transparency: Fact Sheet Toggle */}
          {factSheet && (
            <div style={{ marginTop: '16px', background: 'transparent', padding: '0', border: 'transparent' }}>
              <button 
                onClick={() => {
                  const details = document.getElementById('fact-sheet-details');
                  if (details) details.style.display = details.style.display === 'none' ? 'block' : 'none';
                }}
                style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: '0' }}
              >
                <Info size={14} /> ดูโครงสร้าง Fact Sheet อ้างอิงเบื้องหลัง (Zero-Hallucination)
              </button>
              <div id="fact-sheet-details" style={{ display: 'none', marginTop: '12px', padding: '16px', background: 'var(--bg-900)', borderRadius: '12px', fontSize: '12px', color: '#94a3b8', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--glass-border)' }}>
                {factSheet}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default CreateContent;
