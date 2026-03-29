import { apiFetch } from '../utils/apiFetch';

const extractVideoId = (url = '') => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
};

const parseDuration = (iso = '') => {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const h = parseInt(match[1] || '0');
  const m = parseInt(match[2] || '0');
  const s = parseInt(match[3] || '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// Fetch stats+snippet for a batch of video IDs — only 1 quota unit per call
const fetchVideoDetails = async (videoIds = []) => {
  if (!videoIds.length) return {};
  try {
    const res = await apiFetch(`/api/youtube/videos?id=${videoIds.join(',')}`, { method: 'GET', timeout: 10000 });
    if (!res.ok) return {};
    const data = await res.json();
    const map = {};
    for (const v of (data.items || [])) {
      map[v.id] = {
        snippet: v.snippet || {},
        viewCount: v.statistics?.viewCount,
        likeCount: v.statistics?.likeCount,
        commentCount: v.statistics?.commentCount,
        duration: v.contentDetails?.duration,
      };
    }
    return map;
  } catch {
    return {};
  }
};

const buildVideoNode = (videoId, snippet = {}, stats = {}, tavilyContent = '') => ({
  id: `yt_${videoId}`,
  source: 'youtube',
  videoId,
  title: snippet.title || '',
  text: tavilyContent || snippet.description || '',
  thumbnail: snippet.thumbnails?.medium?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
  channelTitle: snippet.channelTitle || '',
  publishedAt: snippet.publishedAt || '',
  url: `https://www.youtube.com/watch?v=${videoId}`,
  viewCount: stats.viewCount || '0',
  likeCount: stats.likeCount || '0',
  commentCount: stats.commentCount || '0',
  duration: parseDuration(stats.duration),
});

/**
 * Extract YouTube videos from Tavily search results.
 * Used for BOTH normal and lightning mode — avoids expensive YouTube search API (100 units/call).
 * Tavily is already running in the search pipeline, so this adds no extra API cost.
 * Only uses videos.list (1 unit/call) for stats + thumbnail enrichment.
 */
export const extractYouTubeFromTavily = async (tavilyResults = []) => {
  const ytResults = tavilyResults.filter(r => extractVideoId(r.url));
  if (!ytResults.length) return [];

  const entries = ytResults.slice(0, 5).map(r => ({
    videoId: extractVideoId(r.url),
    content: r.content || '',
    title: r.title || '',
  }));

  const videoIds = entries.map(e => e.videoId).filter(Boolean);
  const detailsMap = await fetchVideoDetails(videoIds);

  return entries
    .map(({ videoId, content, title }) => {
      const d = detailsMap[videoId] || {};
      const snippet = d.snippet || {};
      // Prefer API data, fall back to Tavily data
      if (!snippet.title) snippet.title = title;
      return buildVideoNode(videoId, snippet, d, content);
    })
    .filter(v => v.title); // drop videos with no title at all
};

/**
 * Enrich a single YouTube URL pasted by the user in CreateContent.
 * Fetches video metadata (title, thumbnail, channel) + transcript.
 * Returns a sourceNode ready for the content generation pipeline.
 */
export const enrichYouTubeUrl = async (url, signal) => {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  // Fetch metadata and transcript in parallel
  const [detailsMap, transcriptResult] = await Promise.all([
    fetchVideoDetails([videoId]),
    getVideoTranscript(videoId, signal),
  ]);

  const d = detailsMap[videoId] || {};
  const snippet = d.snippet || {};
  const title = transcriptResult?.title || snippet.title || url;
  const transcript = transcriptResult?.transcript || '';

  return {
    source: 'youtube',
    id: `yt_${videoId}`,
    videoId,
    title,
    text: transcript,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: snippet.thumbnails?.medium?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    author: { name: snippet.channelTitle || 'YouTube', username: snippet.channelTitle || 'YouTube', profile_image_url: null },
  };
};

/**
 * Fetch transcript for a video on-demand (when user clicks สร้างคอนเทนต์ on a YouTube card).
 * Zero YouTube API quota — uses web scraping of public YouTube page.
 */
export const getVideoTranscript = async (videoId, signal) => {
  try {
    const res = await apiFetch(`/api/youtube/transcript/${videoId}`, { method: 'GET', timeout: 25000, ...(signal ? { signal } : {}) });
    if (!res.ok) return null;
    return await res.json(); // { transcript, title, lang }
  } catch (err) {
    console.error('[YouTubeService] getVideoTranscript error:', err);
    return null;
  }
};
