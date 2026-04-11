// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import {
  Building2,
  ChevronDown,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  PenSquare,
  Tag,
  User,
  X,
} from 'lucide-react';
import { fetchReadableArticle } from '../services/ArticleService';
import { generateArticleInsights, translateArticleToThai } from '../services/GrokService';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { readPersistedState, writePersistedState } from '../lib/persistence/client';
import { hasSubstantialThaiContent } from '../utils/appUtils';
import { cleanMarkdownForClipboard, normalizeSummaryMarkdown, renderMarkdownToHtml } from '../utils/markdown';

const ARTICLE_CACHE = new Map();
const ARTICLE_INSIGHT_CACHE = new Map();
const ARTICLE_TRANSLATION_CACHE = new Map();

const buildArticleReaderQueryKey = (url) => ['article-reader', 'article', String(url || '').trim()];

const buildStableCacheHash = (value) => {
  let hash = 0;
  const input = String(value || '');

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
};

const buildPersistentTranslationStorageKey = (value) =>
  `${STORAGE_KEYS.articleTranslationCache}:${buildStableCacheHash(value)}`;

const formatArticleDate = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const buildInsightCopy = (insights) =>
  [
    insights?.summary ? `Summary: ${insights.summary}` : '',
    insights?.whyItMatters ? `Why it matters: ${insights.whyItMatters}` : '',
    ...(insights?.keyPoints || []).map((item) => `- ${item}`),
    insights?.companies?.length ? `Companies: ${insights.companies.join(', ')}` : '',
    insights?.people?.length ? `People: ${insights.people.join(', ')}` : '',
    insights?.topics?.length ? `Topics: ${insights.topics.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

const cleanArticleHtml = (html) => {
  if (!html) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove obvious junk by selectors
    const junkSelectors = [
      'nav', 'footer', '.footer', '.menu', '.navigation', '.site-footer', '.global-footer',
      '[class*="footer"]', '[class*="menu"]', '[id*="footer"]', '[id*="menu"]'
    ];
    
    junkSelectors.forEach(selector => {
      doc.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Remove text nodes containing Bloomberg junk
    const keywords = [
      'For Customers', 'Support', 'Company', 'Communications', 'Follow',
      'Products', 'Industry Products', 'Media', 'Media Services',
      'Terms of Service', 'Privacy Policy', 'Cookie Policy', 'Updated on'
    ];
    
    // Pattern to match "April 6, 2026 at 7:35 PM UTC"
    const dateRegex = /^[A-Z][a-z]+\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s+(?:AM|PM)(?:\s+[A-Z]{2,4})?$/i;

    Array.from(doc.querySelectorAll('p, li, div, span, a, h1, h2, h3, h4, h5, h6, b, strong, em, i, time')).forEach(el => {
      const text = (el.textContent || '').trim();
      
      if (
        keywords.includes(text) ||
        text.startsWith('Americas+1') ||
        text.startsWith('EMEA+44') ||
        text.startsWith('Asia Pacific+65') ||
        dateRegex.test(text)
      ) {
        // Only remove if it's a reasonably small leaf-ish node so we don't nuke the whole article
        if (el.innerHTML.length < 500) {
          el.remove();
        }
      }
    });

    // Remove empty lists
    doc.querySelectorAll('ul, ol').forEach(list => {
      if (!list.textContent.trim()) {
        list.remove();
      }
    });

    return doc.body.innerHTML;
  } catch (err) {
    console.error('Error cleaning article HTML:', err);
    return html;
  }
};

const renderSourceBodyHtml = (item, articleData) => {
  if (articleData?.contentHtml) {
    return DOMPurify.sanitize(cleanArticleHtml(articleData.contentHtml));
  }

  if (item?.type === 'article') {
    return renderMarkdownToHtml(item.summary || '');
  }

  const fallbackCopy = normalizeSummaryMarkdown(item?.summary || item?.full_text || item?.text || '');
  return fallbackCopy
    ? renderMarkdownToHtml(fallbackCopy)
    : '<p>Open the original source to read the full article.</p>';
};

const ArticleReaderModal = ({
  article,
  onClose,
  onArticleGen,
}) => {
  const [insightState, setInsightState] = useState({
    key: '',
    status: 'idle',
    data: null,
    error: '',
  });
  const [translationState, setTranslationState] = useState({
    key: '',
    status: 'idle',
    data: null,
    error: '',
  });
  const [persistedTranslationState, setPersistedTranslationState] = useState({
    key: '',
    checked: false,
    data: null,
  });
  const [copyState, setCopyState] = useState('');
  const [openInsightArticleKey, setOpenInsightArticleKey] = useState('');

  const articleUrl = useMemo(() => {
    if (!article) return '';
    if (article?.url) return article.url;
    if (typeof article?.title === 'string' && /^https?:\/\//i.test(article.title)) {
      return article.title;
    }
    return '';
  }, [article]);

  const sourceType = String(article?.sourceType || '').trim().toLowerCase();
  const isRemoteArticle =
    Boolean(articleUrl) && ['rss', 'web_article'].includes(sourceType);
  const articleKey = articleUrl || String(article?.id || article?.title || '');
  const articleTranslationIdentity = useMemo(
    () =>
      String(
        article?.rssFingerprint ||
        article?.id ||
        articleUrl ||
        article?.title ||
        '',
      ).trim(),
    [article?.id, article?.rssFingerprint, article?.title, articleUrl],
  );
  const persistentTranslationStorageKey = useMemo(
    () =>
      articleTranslationIdentity
        ? buildPersistentTranslationStorageKey(articleTranslationIdentity)
        : '',
    [articleTranslationIdentity],
  );
  const insightsOpen = openInsightArticleKey === articleKey;
  const articleQuery = useQuery({
    queryKey: buildArticleReaderQueryKey(articleUrl),
    queryFn: ({ signal }) => fetchReadableArticle(articleUrl, signal),
    enabled: Boolean(article && isRemoteArticle && articleUrl),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 3 * 24 * 60 * 60 * 1000,
    retry: 1,
  });
  const cachedArticle = articleQuery.data || (articleUrl ? ARTICLE_CACHE.get(articleUrl) : null);

  const effectiveArticleState = !article || !isRemoteArticle || !articleUrl
    ? { key: '', status: 'idle', data: null, error: '' }
    : cachedArticle
      ? { key: articleKey, status: 'ready', data: cachedArticle, error: '' }
      : articleQuery.isError
        ? {
          key: articleKey,
          status: 'error',
          data: null,
          error: articleQuery.error instanceof Error ? articleQuery.error.message : 'Unable to load the article body',
        }
        : { key: articleKey, status: 'loading', data: null, error: '' };

  useEffect(() => {
    if (articleUrl && articleQuery.data) ARTICLE_CACHE.set(articleUrl, articleQuery.data);
  }, [articleQuery.data, articleUrl]);

  const insightKey = useMemo(() => {
    const articleData = effectiveArticleState.data;
    if (!article || !isRemoteArticle || effectiveArticleState.status !== 'ready' || !articleData) {
      return '';
    }

    const insightTitle = articleData?.title || article?.title || '';
    const insightBody = articleData?.textContent || article?.full_text || article?.text || '';
    return `${articleKey}::${insightTitle}::${insightBody.slice(0, 800)}`;
  }, [article, articleKey, effectiveArticleState.data, effectiveArticleState.status, isRemoteArticle]);

  const cachedInsight = insightKey ? ARTICLE_INSIGHT_CACHE.get(insightKey) : null;

  const effectiveInsightState = !article || !isRemoteArticle
    ? { key: '', status: 'idle', data: null, error: '' }
    : cachedInsight
      ? { key: insightKey, status: 'ready', data: cachedInsight, error: '' }
      : effectiveArticleState.status === 'ready'
        ? insightState.key === insightKey
          ? insightState
          : { key: insightKey, status: 'loading', data: null, error: '' }
        : effectiveArticleState.status === 'loading'
          ? { key: '', status: 'loading', data: null, error: '' }
          : { key: '', status: 'idle', data: null, error: '' };

  const shouldTranslateArticle = useMemo(() => {
    const articleData = effectiveArticleState.data;
    if (!article || !isRemoteArticle || effectiveArticleState.status !== 'ready' || !articleData) {
      return false;
    }

    const normalizedLang = String(articleData?.lang || '').trim().toLowerCase();
    if (normalizedLang.startsWith('th')) return false;

    const textSample = String(articleData?.textContent || article?.full_text || article?.text || '')
      .slice(0, 500)
      .trim();

    return Boolean(textSample) && !hasSubstantialThaiContent(textSample, {
      minThaiChars: 40,
      minThaiRatio: 0.24,
      minLetterCount: 80,
    });
  }, [article, effectiveArticleState.data, effectiveArticleState.status, isRemoteArticle]);

  const translationKey = useMemo(() => {
    if (!persistentTranslationStorageKey) return '';
    return persistentTranslationStorageKey;
  }, [persistentTranslationStorageKey]);

  useEffect(() => {
    if (!translationKey) return undefined;

    const inMemoryTranslation = ARTICLE_TRANSLATION_CACHE.get(translationKey);
    if (inMemoryTranslation) return undefined;

    let isActive = true;

    readPersistedState({
      key: translationKey,
      scope: 'durable',
      fallbackValue: null,
    })
      .then((result) => {
        if (!isActive) return;

        const nextData = result.exists && result.value?.markdown ? result.value : null;
        if (nextData) {
          ARTICLE_TRANSLATION_CACHE.set(translationKey, nextData);
        }

        setPersistedTranslationState({
          key: translationKey,
          checked: true,
          data: nextData,
        });
      })
      .catch((error) => {
        if (!isActive) return;
        console.warn('[ArticleReaderModal] Failed to hydrate translation cache', error);
        setPersistedTranslationState({
          key: translationKey,
          checked: true,
          data: null,
        });
      });

    return () => {
      isActive = false;
    };
  }, [translationKey]);

  const cachedTranslation =
    (translationKey ? ARTICLE_TRANSLATION_CACHE.get(translationKey) : null) ||
    (persistedTranslationState.key === translationKey ? persistedTranslationState.data : null);
  const isTranslationCacheChecked =
    !translationKey ||
    Boolean(ARTICLE_TRANSLATION_CACHE.get(translationKey)) ||
    (persistedTranslationState.key === translationKey && persistedTranslationState.checked);

  const effectiveTranslationState = !article || !isRemoteArticle
    ? { key: '', status: 'idle', data: null, error: '' }
    : cachedTranslation
      ? { key: translationKey, status: 'ready', data: cachedTranslation, error: '' }
      : !shouldTranslateArticle
        ? { key: '', status: 'skipped', data: null, error: '' }
        : !isTranslationCacheChecked
          ? { key: translationKey, status: 'idle', data: null, error: '' }
        : effectiveArticleState.status === 'ready'
          ? translationState.key === translationKey
            ? translationState
            : { key: translationKey, status: 'loading', data: null, error: '' }
          : effectiveArticleState.status === 'loading'
            ? { key: '', status: 'loading', data: null, error: '' }
            : { key: '', status: 'idle', data: null, error: '' };

  useEffect(() => {
    if (
      !article ||
      !isRemoteArticle ||
      effectiveArticleState.status !== 'ready' ||
      !effectiveArticleState.data ||
      !insightKey ||
      cachedInsight
    ) {
      return;
    }

    const articleData = effectiveArticleState.data;
    const insightTitle = articleData?.title || article?.title || '';
    const insightExcerpt = articleData?.excerpt || article?.summary || '';
    let insightBody = articleData?.textContent || article?.full_text || article?.text || '';
    if (articleData?.contentHtml) {
      try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanArticleHtml(articleData.contentHtml);
        insightBody = tempDiv.innerText || tempDiv.textContent || insightBody;
      } catch (err) {
        console.error(err);
      }
    }

    const insightSource = articleData?.siteName || article?.author?.name || '';
    if (!insightTitle && !insightBody) return;

    let isActive = true;

    generateArticleInsights({
      title: insightTitle,
      excerpt: insightExcerpt,
      content: insightBody,
      siteName: insightSource,
    })
      .then((payload) => {
        if (!isActive) return;
        if (!payload) {
          setInsightState({
            key: insightKey,
            status: 'error',
            data: null,
            error: 'Insights unavailable for this article',
          });
          return;
        }

        ARTICLE_INSIGHT_CACHE.set(insightKey, payload);
        setInsightState({ key: insightKey, status: 'ready', data: payload, error: '' });
      })
      .catch((error) => {
        if (!isActive) return;
        setInsightState({
          key: insightKey,
          status: 'error',
          data: null,
          error: error instanceof Error ? error.message : 'Unable to generate insights',
        });
      });

    return () => {
      isActive = false;
    };
  }, [article, cachedInsight, effectiveArticleState.data, effectiveArticleState.status, insightKey, isRemoteArticle]);

  useEffect(() => {
    if (
      !article ||
      !isRemoteArticle ||
      effectiveArticleState.status !== 'ready' ||
      !effectiveArticleState.data ||
      !shouldTranslateArticle ||
      !translationKey ||
      !isTranslationCacheChecked ||
      cachedTranslation
    ) {
      return;
    }

    const articleData = effectiveArticleState.data;
    let isActive = true;

    let cleanedTranslationText = articleData?.textContent || article?.full_text || article?.text || '';
    if (articleData?.contentHtml) {
      try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanArticleHtml(articleData.contentHtml);
        cleanedTranslationText = tempDiv.innerText || tempDiv.textContent || cleanedTranslationText;
      } catch (err) {
        console.error(err);
      }
    }

    translateArticleToThai({
      title: articleData?.title || article?.title || '',
      excerpt: articleData?.excerpt || article?.summary || '',
      contentMarkdown: '', // Omit to force using cleaned content
      content: cleanedTranslationText,
      siteName: articleData?.siteName || article?.author?.name || '',
    })
      .then((payload) => {
        if (!isActive) return;
        if (!payload?.markdown) {
          setTranslationState({
            key: translationKey,
            status: 'error',
            data: null,
            error: 'Unable to translate the article right now',
          });
          return;
        }

        ARTICLE_TRANSLATION_CACHE.set(translationKey, payload);
        void writePersistedState({
          key: translationKey,
          scope: 'durable',
          value: payload,
        }).catch((persistError) => {
          console.warn('[ArticleReaderModal] Failed to persist translated article', persistError);
        });
        setPersistedTranslationState({
          key: translationKey,
          checked: true,
          data: payload,
        });
        setTranslationState({ key: translationKey, status: 'ready', data: payload, error: '' });
      })
      .catch((error) => {
        if (!isActive) return;
        setTranslationState({
          key: translationKey,
          status: 'error',
          data: null,
          error: error instanceof Error ? error.message : 'Unable to translate the article right now',
        });
      });

    return () => {
      isActive = false;
    };
  }, [
    article,
    cachedTranslation,
    effectiveArticleState.data,
    effectiveArticleState.status,
    isRemoteArticle,
    isTranslationCacheChecked,
    shouldTranslateArticle,
    translationKey,
  ]);

  useEffect(() => {
    if (!copyState) return undefined;
    const timer = window.setTimeout(() => setCopyState(''), 1600);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  useEffect(() => {
    if (!article) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [article]);

  if (!article) return null;

  const articleData = effectiveArticleState.data;
  const translatedTitle = effectiveTranslationState.data?.titleTh || '';
  const displayTitle = translatedTitle || articleData?.title || article?.title || article?.text || 'Untitled article';
  const displayImage = articleData?.leadImageUrl || article?.primaryImageUrl || article?.imageUrls?.[0] || '';
  const displaySource = articleData?.siteName || article?.author?.name || '';
  const displayByline = articleData?.byline || '';
  const displayPublishedAt = formatArticleDate(articleData?.publishedAt || article?.created_at || article?.createdAt);
  const displayReadingTime = articleData?.readingTimeMinutes || 0;
  const translatedMarkdown = effectiveTranslationState.data?.markdown || '';
  const bodyHtml = translatedMarkdown
    ? renderMarkdownToHtml(translatedMarkdown)
    : effectiveTranslationState.status === 'loading' && shouldTranslateArticle
      ? '<p>กำลังแปลบทความเป็นภาษาไทย...</p>'
      : renderSourceBodyHtml(article, articleData);
  let articleBodyHtml =
    effectiveTranslationState.status === 'loading' && shouldTranslateArticle
      ? renderSourceBodyHtml(article, articleData)
      : bodyHtml;

  if (displayImage && articleBodyHtml) {
    const escapedImgUrl = displayImage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const imgRegex = new RegExp(`(?:<figure[^>]*>[\\s\\S]*?)?<img[^>]+src=["']?${escapedImgUrl}["']?[^>]*>(?:[\\s\\S]*?</figure>)?`, 'i');
    articleBodyHtml = articleBodyHtml.replace(imgRegex, '');
  }
  const articleCopyValue = translatedMarkdown
    ? cleanMarkdownForClipboard(translatedMarkdown)
    : articleData?.textContent
      || cleanMarkdownForClipboard(normalizeSummaryMarkdown(article?.summary || article?.full_text || article?.text || ''));
  const insightCopyValue = buildInsightCopy(effectiveInsightState.data);

  const handleCopy = async (label, value) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopyState(label);
    } catch (error) {
      console.error(error);
      setCopyState('copy-error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content article-reader-modal article-reader-shell"
        style={{ maxWidth: '980px', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="article-reader-topbar">
          <div className="article-reader-kicker">
            <span className="article-reader-kicker-badge">Reader</span>
            {displaySource ? <span className="article-reader-kicker-source">{displaySource}</span> : null}
          </div>

          <h2 className="modal-title article-reader-title article-reader-hero-title">
            {displayTitle}
          </h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
            <div className="article-reader-meta-row" style={{ margin: 0 }}>
              {displayByline ? <span>{displayByline}</span> : null}
              {displayPublishedAt ? <span>{displayPublishedAt}</span> : null}
              {displayReadingTime ? (
                <span className="article-reader-meta-chip">
                  <Clock3 size={13} />
                  {displayReadingTime} min read
                </span>
              ) : null}
              {translatedMarkdown ? (
                <span className="article-reader-meta-chip">Thai translation</span>
              ) : null}
            </div>

            <div className="article-reader-action-row" style={{ margin: 0 }}>
              <button
                type="button"
                className="btn-mini-ghost"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: '0 12px',
                  height: '32px',
                  fontSize: '12px'
                }}
                onClick={() => handleCopy('article', articleCopyValue)}
              >
                <Copy size={13} />
                {copyState === 'article' ? 'Copied' : 'Copy article'}
              </button>
              {onArticleGen ? (
                <button
                  type="button"
                  className="btn-mini-ghost"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    padding: '0 12px',
                    height: '32px',
                    fontSize: '12px'
                  }}
                  onClick={() => { onArticleGen(article); onClose(); }}
                >
                  <PenSquare size={13} />
                  Create content
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {effectiveInsightState.status !== 'idle' && (
          <section className={`article-insights-panel${insightsOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="article-insights-toggle"
              onClick={() => setOpenInsightArticleKey((currentKey) => (currentKey === articleKey ? '' : articleKey))}
              aria-expanded={insightsOpen}
            >
              <div className="article-insights-title-row">
                <span className="article-insights-badge" aria-hidden="true">AI</span>
                <div>
                  <div className="article-insights-title">Insights</div>
                  <div className="article-insights-subtitle">
                    {effectiveInsightState.status === 'loading'
                      ? 'Preparing a tighter read'
                      : 'สรุป 15 วินาทีก่อนอ่านเต็ม'}
                  </div>
                </div>
              </div>
              <ChevronDown
                size={16}
                className={`article-insights-chevron${insightsOpen ? ' open' : ''}`}
              />
            </button>

            {insightsOpen && effectiveInsightState.status === 'loading' && (
              <div className="article-insights-loading">
                <Loader2 size={16} className="animate-spin" />
                <span>Generating AI insights...</span>
              </div>
            )}

            {insightsOpen && effectiveInsightState.status === 'ready' && effectiveInsightState.data && (
              <div className="article-insights-body">
                <div className="article-insights-grid">
                  <div className="article-insights-summary">
                    <div className="article-insights-summary-line">{effectiveInsightState.data.summary}</div>
                    {effectiveInsightState.data.whyItMatters ? (
                      <div className="article-insights-summary-note">{effectiveInsightState.data.whyItMatters}</div>
                    ) : null}
                    {effectiveInsightState.data.keyPoints?.length > 0 && (
                      <ul className="article-insights-bullets">
                        {effectiveInsightState.data.keyPoints.slice(0, 2).map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="article-insights-sidecards">
                    {effectiveInsightState.data.companies?.length > 0 && (
                      <div className="article-insights-mini-card">
                        <div className="article-insights-mini-title">
                          <Building2 size={14} />
                          {effectiveInsightState.data.companies.length} Companies
                        </div>
                        <div className="article-insights-chip-row">
                          {effectiveInsightState.data.companies.map((item) => (
                            <span key={item} className="article-insights-chip article-insights-chip--company">{item}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {effectiveInsightState.data.people?.length > 0 && (
                      <div className="article-insights-mini-card">
                        <div className="article-insights-mini-title">
                          <User size={14} />
                          People
                        </div>
                        <div className="article-insights-chip-row">
                          {effectiveInsightState.data.people.map((item) => (
                            <span key={item} className="article-insights-chip article-insights-chip--person">{item}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {effectiveInsightState.data.topics?.length > 0 && (
                      <div className="article-insights-mini-card">
                        <div className="article-insights-mini-title">
                          <Tag size={14} />
                          Topics
                        </div>
                        <div className="article-insights-chip-row">
                          {effectiveInsightState.data.topics.map((item) => (
                            <span key={item} className="article-insights-chip article-insights-chip--topic">{item}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {insightCopyValue ? (
                  <div className="article-insights-footer">
                    <button
                      type="button"
                      className="btn-mini-ghost"
                      onClick={() => handleCopy('insights', insightCopyValue)}
                    >
                      <Copy size={13} />
                      {copyState === 'insights' ? 'Copied' : 'Copy insights'}
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {insightsOpen && effectiveInsightState.status === 'error' && (
              <div className="article-insights-error">
                {effectiveInsightState.error}
              </div>
            )}
          </section>
        )}

        {displayImage && (
          <div className="article-reader-image-shell">
            <img
              src={displayImage}
              alt={displayTitle}
              className="article-reader-image"
            />
          </div>
        )}

        {effectiveArticleState.status === 'loading' && (
          <div className="article-reader-loading">
            <Loader2 size={18} className="animate-spin" />
            <span>Loading readable article view...</span>
          </div>
        )}

        {effectiveArticleState.status === 'ready' && effectiveTranslationState.status === 'loading' && shouldTranslateArticle && (
          <div className="article-reader-loading">
            <Loader2 size={18} className="animate-spin" />
            <span>Translating article to Thai...</span>
          </div>
        )}



        <div
          key={effectiveTranslationState.status}
          className="markdown-body article-reader-markdown article-reader-body animate-fade-in"
          style={{
            transition: 'opacity 0.5s ease',
            opacity: effectiveTranslationState.status === 'loading' && shouldTranslateArticle ? 0.35 : 1,
          }}
          dangerouslySetInnerHTML={{ __html: articleBodyHtml }}
        />

        <div className="article-reader-footer">
          <div className="article-reader-footer-note">
            <FileText size={13} />
            Reader view is extracted automatically from the source page and may vary by site.
          </div>
          <div className="article-reader-footer-actions">
            {articleUrl ? (
              <a
                href={articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pill"
              >
                <ExternalLink size={14} />
                Open original source
              </a>
            ) : null}
            <button className="modal-btn modal-btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleReaderModal;
