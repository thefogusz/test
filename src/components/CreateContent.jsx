import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, FileText, CheckCircle2, ListVideo, ShieldCheck, Copy, MessageSquare, Hash, Plus, Loader2, Info, ChevronDown, Smile, Maximize2, X, PenTool, Bookmark, ExternalLink } from 'lucide-react';
import { researchAndPreventHallucination, generateStructuredContentV2 } from '../services/GrokService';
import { renderMarkdownToHtml } from '../utils/markdown';

const THINKING_PHASES = {
  researching: [
    'Researching source material...',
    'Cross-checking external references...',
    'Summarizing the key facts...',
    'Preparing the writing brief...',
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

const FORMAT_OPTIONS = [
  { id: 'โพสต์โซเชียล', title: 'โพสต์โซเชียล', icon: MessageSquare },
  { id: 'สคริปต์วิดีโอสั้น', title: 'วิดีโอสั้น / Reels', icon: ListVideo },
  { id: 'บทความ SEO / บล็อก', title: 'บทความ Blog/SEO', icon: FileText },
  { id: 'โพสต์ให้ความรู้ (Thread)', title: 'X Thread', icon: Hash },
];

const TONE_OPTIONS = ['ให้ข้อมูล/ปกติ', 'กระตือรือร้น/ไวรัล', 'ทางการ/วิชาการ', 'เป็นกันเอง/เพื่อนเล่าให้ฟัง', 'ตลก/มีอารมณ์ขัน', 'ดุดัน/วิจารณ์เชิงลึก', 'ฮาร์ดเซลล์/ขายของ'];
const LENGTH_OPTIONS = ['สั้น กระชับ', 'ขนาดกลาง (มาตรฐาน)', 'ยาว แบบเจาะลึก'];

const FORMAT_HINTS = {
  'โพสต์โซเชียล': 'เหมาะกับข้อความที่อ่านลื่นแบบโพสต์จริง ไม่ต้องมีหัวข้อย่อย',
  'สคริปต์วิดีโอสั้น': 'เหมาะกับสคริปต์พูดจริง ประโยคสั้น จังหวะชัด ไม่ต้องใช้หัวข้อ',
  'บทความ SEO / บล็อก': 'เหมาะกับงานที่ต้องการบริบทและโครงสร้างชัด ค่อยใช้หัวข้อเมื่อจำเป็น',
  'โพสต์ให้ความรู้ (Thread)': 'เหมาะกับการเล่าเป็นลำดับความคิดทีละช่วง โดยไม่ต้องทำให้ดูเป็นบทความเต็ม',
};

const CustomDropdown = ({ icon, value, onChange, options, isObject }) => {
  const [isOpen, setIsOpen] = useState(false);
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

  const selectedTitle = isObject ? options.find(o => o.id === value)?.title : value;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
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
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
          background: 'var(--bg-800)', border: '1px solid var(--glass-border)',
          borderRadius: '16px', padding: '8px', minWidth: '220px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: '4px',
          animation: 'fadeIn 0.15s ease-out'
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
                  width: '100%', padding: '10px 12px',
                  background: isSelected ? 'rgba(41, 151, 255, 0.1)' : 'transparent',
                  color: isSelected ? 'var(--accent-secondary)' : '#fff',
                  border: 'none', borderRadius: '8px',
                  fontSize: '13px', fontWeight: isSelected ? '700' : '500',
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
  setPhase
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
  const [thinkingStep, setThinkingStep] = useState(0);
  const activeFormatHint = FORMAT_HINTS[format] || FORMAT_HINTS['โพสต์โซเชียล'];

  useEffect(() => {
    if (!isGenerating) { setThinkingStep(0); return; }
    const steps = THINKING_PHASES[phase] || THINKING_PHASES.researching;
    const interval = setInterval(() => {
      setThinkingStep(s => (s + 1) % steps.length);
    }, 1000);
    return () => clearInterval(interval);
  }, [isGenerating, phase]);

  // Persistence effects
  useEffect(() => { localStorage.setItem('foro_gen_input_v1', input); }, [input]);
  useEffect(() => { localStorage.setItem('foro_gen_length_v1', length); }, [length]);
  useEffect(() => { localStorage.setItem('foro_gen_tone_v1', tone); }, [tone]);
  useEffect(() => { localStorage.setItem('foro_gen_format_v1', format); }, [format]);
  useEffect(() => { if (factSheet) localStorage.setItem('foro_gen_factsheet_v1', factSheet); else localStorage.removeItem('foro_gen_factsheet_v1'); }, [factSheet]);
  useEffect(() => { localStorage.setItem('foro_gen_sources_v1', JSON.stringify(articleSources)); }, [articleSources]);
  useEffect(() => { localStorage.setItem('foro_gen_markdown_v1', generatedMarkdown); }, [generatedMarkdown]);

  const handleGenerate = async () => {
    const isManualInputValid = input.trim().length > 0;
    const hasSource = !!sourceNode;
    
    if (!isManualInputValid && !hasSource) return;

    setIsGenerating(true);
    setFactSheet(null);
    setArticleSources([]);
    setGeneratedMarkdown('');
    setError(null);
    setPhase('researching');
    
    try {
      // If we have an attached source from Feed
      let factIntel = '';
      if (sourceNode) {
        factIntel = `[ATTACHED INTEL - ข้อมูลตั้งต้นที่แนบมา]\nหัวข้อ: ${sourceNode.title || 'ไม่มีหัวข้อ'}\nเนื้อหา: ${sourceNode.summary || sourceNode.text}\nแหล่งที่มา: @${sourceNode.author?.username || 'Unknown'}\n\n`;
      }
      
      const combinedInputForResearch = `${factIntel}คำสั่ง/ประเด็นหลักที่ต้องการ: ${input}`;

      // 1. Research Phase
      const { factSheet: facts, sources: rawSources } = await researchAndPreventHallucination(combinedInputForResearch);
      setFactSheet(facts);
      setArticleSources(rawSources || []);
      setPhase('generating');

      // 2. Generation Phase (Streaming)
      const appliedTone = tone;

      const allowEmoji = EMOJI_REQUEST_PATTERN.test(customInstructions);
      const lengthIndex = LENGTH_OPTIONS.indexOf(length);
      const normalizedLength = lengthIndex === 0 ? 'short' : lengthIndex === 2 ? 'long' : 'medium';

      await generateStructuredContentV2(
        facts,
        normalizedLength,
        appliedTone,
        format,
        (currentText) => {
          setGeneratedMarkdown(currentText); // Stream to UI instantly
        },
        { allowEmoji, customInstructions }
      );
      
      setPhase('done'); // Done
      
      // Auto-scroll to result gracefully only after it's done
      setTimeout(() => {
        const resEl = document.getElementById('content-result');
        if (resEl) resEl.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err) {
      console.error('Generation Error [Detailed]:', err);
      const stage = phase === 'researching' ? 'Research' : 'Generation';
      let msg = err.message || 'Unknown Error';
      
      // Handle the "Response is not defined" case or similar Vercel AI SDK errors
      if (err.name === 'Error' && !err.message) msg = 'API Communication Error';
      
      setError(`${stage} Failed: ${msg}. กรุณาลองใหม่อีกครั้ง หรือสรุปข้อมูลสั้นลง`);
      setPhase('done');
    } finally {
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
  };

  return (
    <div style={{ padding: '0 20px 40px', maxWidth: '840px', margin: '0 auto', color: '#fff', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Compact Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', marginTop: '10px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles className="text-accent" size={24} /> สร้างคอนเทนต์
          </h1>
          <p style={{ color: 'var(--text-dim)', margin: '4px 0 0', fontSize: '14px' }}>
            เปลี่ยนไอเดียให้เป็นคอนเทนต์ระดับมืออาชีพ พร้อม Zero-Hallucination
          </p>
        </div>
        {generatedMarkdown && (
          <button onClick={clearForm} className="btn-mini-ghost" style={{ padding: '8px 16px' }}>
            <Plus size={14} /> สร้างคอนเทนต์ใหม่
          </button>
        )}
      </div>

      {/* Unified Editor Interface */}
      <div style={{ 
        background: 'var(--bg-800)', 
        borderRadius: '20px',
        border: '1px solid var(--card-border)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        /* Removed overflow: hidden because it clips the dropdown menus */
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        
        {/* Attached Source Notification Area */}
        {sourceNode && (
          <div style={{ 
            background: 'linear-gradient(90deg, rgba(41, 151, 255, 0.1), transparent)', 
            borderBottom: '1px solid var(--glass-border)', 
            padding: '16px 24px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ 
                background: 'rgba(41, 151, 255, 0.2)', padding: '10px', 
                borderRadius: '12px', color: 'var(--accent-secondary)' 
              }}>
                <Sparkles size={20} />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-secondary)', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  แหล่งข้อมูลอ้างอิงแนบมาแล้ว (ATTACHED INTEL)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img 
                    src={sourceNode.author?.profile_image_url} 
                    alt="" 
                    style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div style={{ fontSize: '14px', color: '#fff', fontWeight: '500' }}>@{sourceNode.author?.username}</div>
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  "{sourceNode.summary || sourceNode.text}"
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

        {/* Huge Main Input Area */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={sourceNode ? "คุณต้องการให้สร้างคอนเทนต์รูปแบบไหน หรือเน้นย้ำประเด็นใดเป็นพิเศษ? (ระบุเพิ่มเติมได้)..." : "คุณอยากเล่าเรื่องอะไร? (วางลิงก์ข่าว, เรื่องย่อ, หรือพิมพ์ไอเดียที่นี่หัวข้อเดียวจบ...)"}
          disabled={isGenerating}
          style={{ 
            width: '100%', minHeight: sourceNode ? '160px' : '240px', resize: 'vertical', fontSize: '16px', lineHeight: '1.6',
            padding: '24px', background: 'transparent', border: 'none', color: '#ffffff', outline: 'none',
            fontFamily: 'inherit'
          }}
        />

        {/* Optional Custom Instructions Ribbon */}
        {showAdvanced && (
           <div style={{ padding: '0 24px 16px', animation: 'fadeIn 0.2s ease-out', position: 'relative' }}>
             <input
               type="text"
               placeholder="คำสั่งเพิ่มเติม (เช่น เน้นคำพาดหัวแรงๆ, ไม่ใช้อีโมจิ, เพิ่มช่องทางติดต่อ...)"
               value={customInstructions}
               onChange={(e) => setCustomInstructions(e.target.value)}
               disabled={isGenerating}
               autoFocus
               style={{
                 width: '100%', padding: '12px 40px 12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)',
                 borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s'
               }}
               onFocus={(e) => e.target.style.borderColor = 'var(--accent-secondary)'}
               onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
             />
             <button 
               onClick={() => { setShowAdvanced(false); setCustomInstructions(''); }}
               style={{ position: 'absolute', right: '36px', top: '12px', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
             >
               <X size={16} />
             </button>
           </div>
        )}

        {/* Powerful Compact Toolbar */}
        <div className="create-content-toolbar" style={{ 
          background: 'var(--bg-900)', 
          borderTop: '1px solid var(--glass-border)', 
          borderRadius: '0 0 20px 20px',
          padding: '16px 24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Left: Settings Group & Actions */}
          <div className="create-content-toolbar-left" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div className="create-content-toolbar-controls" style={{ 
              display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
              background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '100px',
              border: '1px solid rgba(255,255,255,0.03)'
            }}>
              <CustomDropdown icon={FileText} value={format} onChange={setFormat} options={FORMAT_OPTIONS} isObject={true} />
              <CustomDropdown icon={Smile} value={tone} onChange={setTone} options={TONE_OPTIONS} />
              <CustomDropdown icon={Maximize2} value={length} onChange={setLength} options={LENGTH_OPTIONS} />
            </div>
            
            {!showAdvanced && (
              <button 
                onClick={() => setShowAdvanced(true)}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--text-dim)',
                  fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 12px', borderRadius: '100px', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <Plus size={14} /> คำสั่งพิเศษ
              </button>
            )}
          </div>

          <div style={{ width: '100%', fontSize: '12px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
            {activeFormatHint}
          </div>
          
          {/* Right: Premium Generate Button */}
          <button 
            className="create-content-generate-btn"
            onClick={handleGenerate}
            disabled={isGenerating || (!input.trim() && !sourceNode)}
            style={{
              marginLeft: 'auto', // Guarantee right alignment even if wrapped
              background: (isGenerating || (!input.trim() && !sourceNode)) ? 'transparent' : 'var(--accent-secondary)',
              color: (isGenerating || (!input.trim() && !sourceNode)) ? 'var(--text-muted)' : '#ffffff',
              border: (isGenerating || (!input.trim() && !sourceNode)) ? '1px solid var(--glass-border)' : '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '100px',
              padding: '12px 32px', 
              fontSize: '15px', 
              fontWeight: '800',
              cursor: (isGenerating || (!input.trim() && !sourceNode)) ? 'not-allowed' : 'pointer',
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              boxShadow: (isGenerating || (!input.trim() && !sourceNode)) ? 'none' : '0 8px 24px rgba(41, 151, 255, 0.4)',
              transition: 'all 0.3s ease'
            }}
          >
            {isGenerating ? (
              <><Loader2 size={18} className="spinner" /> กำลังสร้าง...</>
            ) : (
              <><Sparkles size={18} /> สร้างคอนเทนต์</>
            )}
          </button>
        </div>
        
        {/* Progress Bar - indeterminate flowing animation */}
        {isGenerating && (
           <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'rgba(255,255,255,0.06)', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px', overflow: 'hidden' }}>
             <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '40%', background: 'linear-gradient(90deg, transparent, var(--accent-secondary), transparent)', animation: 'progress-flow 1.8s ease-in-out infinite' }} />
           </div>
        )}
      </div>

      {/* ===== PREMIUM AGENT PIPELINE UI ===== */}
      {isGenerating && (
        <div style={{ marginTop: '24px', animation: 'fadeIn 0.4s ease-out' }}>
          {/* Agent Nodes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', justifyContent: 'center', marginBottom: '24px' }}>
            {[
              { id: 'research', emoji: 'R', label: 'Harper Research', sub: 'Fact-checking & Web Search', active: ['researching'].includes(phase), done: ['generating', 'done'].includes(phase) },
              { id: 'factcheck', emoji: 'F', label: 'Inspector Agent', sub: 'Cross-referencing sources', active: phase === 'researching' && thinkingStep >= 2, done: ['generating', 'done'].includes(phase) },
              { id: 'writer', emoji: 'W', label: 'AI Writer', sub: 'Drafting & streaming', active: phase === 'generating', done: phase === 'done' },
            ].map((agent, i) => (
              <React.Fragment key={agent.id}>
                {/* Connector line between nodes */}
                {i > 0 && (
                  <div style={{ flex: 1, height: '2px', maxWidth: '60px', background: agent.done ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.08)', transition: 'background 0.8s ease', position: 'relative', overflow: 'hidden' }}>
                    {agent.active && (
                      <div style={{ position: 'absolute', top: 0, left: '-40px', width: '40px', height: '100%', background: 'linear-gradient(90deg, transparent, var(--accent-secondary), transparent)', animation: 'shimmer 1.2s infinite linear' }} />
                    )}
                  </div>
                )}
                {/* Agent Node */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.4s' }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
                    background: agent.done ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))' 
                      : agent.active ? 'linear-gradient(135deg, rgba(41,151,255,0.2), rgba(41,151,255,0.05))' 
                      : 'rgba(255,255,255,0.04)',
                    border: agent.done ? '1.5px solid rgba(16,185,129,0.4)' 
                      : agent.active ? '1.5px solid rgba(41,151,255,0.5)' 
                      : '1.5px solid rgba(255,255,255,0.07)',
                    boxShadow: agent.active ? '0 0 20px rgba(41,151,255,0.25)' : agent.done ? '0 0 12px rgba(16,185,129,0.15)' : 'none',
                    transition: 'all 0.4s ease',
                  }}>
                    {agent.done ? 'OK' : agent.emoji}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: agent.active ? 'var(--accent-secondary)' : agent.done ? '#10b981' : 'rgba(255,255,255,0.4)', transition: 'color 0.4s' }}>{agent.label}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '2px', maxWidth: '90px', lineHeight: '1.3' }}>{agent.sub}</div>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
          {/* Live status line */}
          <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--accent-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <Loader2 size={14} className="animate-spin" />
            {(THINKING_PHASES[phase] || THINKING_PHASES.researching)[thinkingStep]}
          </div>
          {/* Global progress track - now uses a continuous crawling animation for better "live" feel */}
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden', maxWidth: '320px', margin: '16px auto 0' }}>
            <div style={{ 
              height: '100%', 
              background: 'linear-gradient(90deg, var(--accent-secondary), #a855f7)', 
              borderRadius: '999px', 
              width: '0%', 
              animation: isGenerating ? 'progress-crawl 60s cubic-bezier(0.1, 0, 0.4, 1) forwards' : 'none'
            }} />
          </div>
        </div>
      )}
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
            <div className="content-result-actions" style={{ display: 'flex', gap: '8px' }}>
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
                  if (onSaveArticle) onSaveArticle(input.substring(0, 40) + '...', generatedMarkdown);
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
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ExternalLink size={16} /> แหล่งข้อมูลอ้างอิงจริง (Zero-Hallucination Sources)
              </h3>
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
