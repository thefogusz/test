// @ts-nocheck
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getUserInfo } from '../services/TwitterService';
import { discoverTopExpertsStrict } from '../services/GrokService';
import { usePersistentState } from './usePersistentState';

const normalizeAudienceQuery = (value = '') => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
const normalizeHandle = (value = '') => String(value || '').replace(/^@/, '').trim().toLowerCase();
const AUDIENCE_LOAD_MORE_MAX_ATTEMPTS = 3;
const buildAudienceExpansionQueries = (query = '') => {
  const base = String(query || '').trim();
  if (!base) return [];
  const normalized = normalizeAudienceQuery(base);
  const expanded = [
    base,
    `${base} experts`,
    `${base} analysts`,
    `${base} news`,
    `${base} journalists`,
    `${base} researchers`,
  ];

  if (/(crypto|คริปโต|bitcoin|blockchain|ethereum|defi|web3)/i.test(normalized)) {
    expanded.push('bitcoin experts', 'ethereum experts', 'crypto journalists', 'defi analysts', 'onchain researchers');
  }

  if (/(invest|ลงทุน|stock|หุ้น|market|ตลาด|macro|เศรษฐกิจ|finance|การเงิน)/i.test(normalized)) {
    expanded.push('macro investors', 'market strategists', 'stock analysts', 'financial journalists', 'global macro');
  }

  if (/(ai|artificial intelligence|machine learning|llm|gpt)/i.test(normalized)) {
    expanded.push('AI researchers', 'machine learning engineers', 'LLM builders', 'AI product leaders', 'AI labs');
  }

  return Array.from(new Set(expanded.map((value) => value.trim()).filter(Boolean)));
};

const AUDIENCE_TOPIC_FALLBACKS = {
  crypto: [
    { username: 'banklesshq', name: 'Bankless', reasoning: 'สื่อและคอนเทนต์ฝั่ง Ethereum/crypto ที่เกาะทั้งโปรเจกต์ ผู้สร้าง และ narrative ของวงการค่อนข้างใกล้' },
    { username: 'APompliano', name: 'Anthony Pompliano', reasoning: 'นักลงทุนและครีเอเตอร์ที่หยิบ Bitcoin ตลาดทุน และมหภาคมาเล่าให้คนทั่วไปตามได้ง่าย' },
    { username: 'nic__carter', name: 'Nic Carter', reasoning: 'นักวิเคราะห์และนักลงทุนที่เด่นเรื่อง policy โครงสร้างอุตสาหกรรม และมุมคิดเชิงลึกของคริปโต' },
    { username: 'DocumentingBTC', name: 'Documenting ₿itcoin 📄', reasoning: 'บัญชีฝั่ง Bitcoin ที่รวบรวมคำพูด ข้อมูล และสัญญาณสำคัญจากคนในวงได้ไวและตามง่าย' },
    { username: 'ercwl', name: 'Eric Wall', reasoning: 'นักวิเคราะห์คริปโตที่มักมีมุมมองตรงและลึกกับประเด็นที่คนในวงกำลังถกกันจริง' },
    { username: 'matthew_sigel', name: 'Matthew Sigel, recovering CFA', reasoning: 'เด่นเรื่องตลาดคริปโตในมุมสถาบันและผลิตภัณฑ์การลงทุน เหมาะกับคนที่ตามฝั่ง adoption และ capital flows' },
    { username: 'RyanSAdams', name: 'RSA', reasoning: 'สาย Ethereum/crypto ที่เชื่อมภาพระบบนิเวศ โปรดักต์ และบทสนทนาในวงการได้ค่อนข้างดี' },
    { username: 'DefiantNews', name: 'The Defiant', reasoning: 'สำนักข่าว/สื่อฝั่ง DeFi และ onchain ที่ช่วยเติมมุมโปรโตคอลกับตลาดคริปโตนอกเหนือจากฟีดข่าวหลัก' },
  ],
  investing: [
    { username: 'awealthofcs', name: 'Ben Carlson', reasoning: 'นักเขียนและนักลงทุนที่อธิบายตลาด การจัดพอร์ต และพฤติกรรมการลงทุนได้อ่านง่ายและใช้งานได้จริง' },
    { username: 'TKL_83', name: 'Kris Abdelmessih', reasoning: 'เด่นเรื่องการคิดความเสี่ยง การเทรด และโครงสร้างผลตอบแทนในมุมที่ลึกกว่าฟีดตลาดทั่วไป' },
    { username: 'M_C_Klein', name: 'Matthew C. Klein', reasoning: 'นักเขียนเศรษฐกิจและการเงินที่พาเข้าใจภาพมหภาคกับตลาดแบบเป็นระบบ' },
    { username: 'TheTranscript_', name: 'The Transcript', reasoning: 'รวมบทสัมภาษณ์และความเห็นจากนักลงทุน ผู้บริหาร และคนตลาด ช่วยให้เห็นมุมคิดจากตัวจริงหลายสาย' },
  ],
  ai: [
    { username: 'sama', name: 'Sam Altman', reasoning: 'มุมจากคนขับบริษัท AI แนวหน้า จะได้ตามทั้งทิศทางผลิตภัณฑ์และบทสนทนาที่กระทบวงการกว้าง' },
    { username: 'AndrewYNg', name: 'Andrew Ng', reasoning: 'อธิบาย AI ในแบบที่เชื่อมจากเทคโนโลยีไปสู่การใช้งานจริง เหมาะกับคนที่อยากเข้าใจแล้วเอาไปต่อยอด' },
    { username: 'karpathy', name: 'Andrej Karpathy', reasoning: 'เน้นมุมเทคนิค โมเดล และการ build ของจริงในภาษาที่คนเทคตามได้สนุกและได้สาระ' },
    { username: 'demishassabis', name: 'Demis Hassabis', reasoning: 'มุมจากทั้งนักวิจัยและผู้บริหาร จึงได้เห็นทั้งวิสัยทัศน์ งานวิจัย และทิศทางของ AI ระดับแนวหน้า' },
  ],
};

const buildAudienceFallbackExperts = (query = '') => {
  const normalized = normalizeAudienceQuery(query);
  if (/(crypto|คริปโต|bitcoin|blockchain|ethereum|defi|web3)/i.test(normalized)) {
    return AUDIENCE_TOPIC_FALLBACKS.crypto;
  }
  if (/(invest|ลงทุน|stock|หุ้น|market|ตลาด|macro|เศรษฐกิจ|finance|การเงิน)/i.test(normalized)) {
    return AUDIENCE_TOPIC_FALLBACKS.investing;
  }
  if (/(ai|artificial intelligence|machine learning|llm|gpt)/i.test(normalized)) {
    return AUDIENCE_TOPIC_FALLBACKS.ai;
  }
  return [];
};

const buildAudienceExpertsQueryKey = (query, excludes = []) => [
  'audience-experts',
  'v10',
  normalizeAudienceQuery(query),
  Array.from(new Set((excludes || []).map(normalizeHandle).filter(Boolean))).sort(),
];

const buildAudienceUserQueryKey = (username) => [
  'audience-user',
  normalizeHandle(username),
];

type UseAudienceSearchParams = {
  watchlist: any[];
  hasWatchlistRoomFor: (handle: string) => boolean;
  handleAddUser: (user: any) => void;
};

export const useAudienceSearch = ({
  watchlist,
  hasWatchlistRoomFor,
  handleAddUser: addUserToWatchlist,
}: UseAudienceSearchParams) => {
  const queryClient = useQueryClient();
  const [audienceTab, setAudienceTab] = usePersistentState(STORAGE_KEYS.audienceTab, 'ai');
  const [aiQuery, setAiQuery] = useState('');
  const [aiSearchResults, setAiSearchResults] = useState([]);
  const [aiSearchOverflowResults, setAiSearchOverflowResults] = useState([]);
  const [aiSearchSeenUsernames, setAiSearchSeenUsernames] = useState([]);
  const [hasSearchedAudience, setHasSearchedAudience] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [manualPreview, setManualPreview] = useState(null);

  const aiSearchMutation = useMutation({
    mutationFn: async ({ query, excludes }) => {
      const normalizedQuery = normalizeAudienceQuery(query);
      if (!normalizedQuery) return [];

      return queryClient.fetchQuery({
        queryKey: buildAudienceExpertsQueryKey(normalizedQuery, excludes),
        queryFn: () => discoverTopExpertsStrict(query, excludes),
        staleTime: 6 * 60 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        retry: 0,
      });
    },
  });

  const manualSearchMutation = useMutation({
    mutationFn: async (username) => {
      const normalizedUsername = normalizeHandle(username);
      if (!normalizedUsername) return null;

      return queryClient.fetchQuery({
        queryKey: buildAudienceUserQueryKey(normalizedUsername),
        queryFn: () => getUserInfo(normalizedUsername),
        staleTime: 24 * 60 * 60 * 1000,
        gcTime: 3 * 24 * 60 * 60 * 1000,
        retry: 1,
      });
    },
    onSuccess: (data) => {
      if (data) setManualPreview(data);
    },
  });

  const handleAiSearchAudience = async (q, isMore = false) => {
    const query = String(q || aiQuery || '').trim();
    if (!query || aiSearchMutation.isPending) return;

    try {
      const excludes = [
        ...watchlist.map(u => u.username),
        ...(isMore ? aiSearchSeenUsernames : [])
      ];
      if (isMore && aiSearchOverflowResults.length > 0) {
        const nextResults = aiSearchOverflowResults.slice(0, 6);
        setAiSearchResults(prev => [...prev, ...nextResults]);
        setAiSearchOverflowResults(aiSearchOverflowResults.slice(6));
        setAiSearchSeenUsernames(prev => Array.from(new Set([...prev, ...nextResults.map(u => u.username).filter(Boolean)])));
        return;
      }

      let nextExperts = [];
      let overflowExperts = [];
      let combinedCandidates = [];
      let attemptExcludes = [...excludes];
      let appendedCount = 0;
      let appendedHandles = [];

      const attemptQueries = isMore
        ? buildAudienceExpansionQueries(query).slice(0, AUDIENCE_LOAD_MORE_MAX_ATTEMPTS)
        : [query];

      for (let attempt = 0; attempt < attemptQueries.length; attempt += 1) {
        const experts = await aiSearchMutation.mutateAsync({ query: attemptQueries[attempt], excludes: attemptExcludes });
        overflowExperts = Array.isArray(experts.overflowExperts) ? experts.overflowExperts : [];
        nextExperts = Array.isArray(experts) ? experts : [];
        combinedCandidates = [...nextExperts, ...overflowExperts];

        if (!isMore) break;

        const nextBatchHandles = [
          ...nextExperts.map((u) => normalizeHandle(u?.username)),
          ...overflowExperts.map((u) => normalizeHandle(u?.username)),
        ].filter(Boolean);

        const currentSeen = new Set([
          ...watchlist.map((u) => normalizeHandle(u?.username)),
          ...aiSearchSeenUsernames.map(normalizeHandle),
        ]);
        const uniqueNextExperts = nextExperts.filter((item) => !currentSeen.has(normalizeHandle(item?.username)));

        if (uniqueNextExperts.length > 0 || nextBatchHandles.length === 0) {
          break;
        }

        attemptExcludes = Array.from(new Set([...attemptExcludes, ...nextBatchHandles]));
      }

      if (isMore) {
        if (nextExperts.length > 0) {
          const seen = new Set(aiSearchResults.map((item) => normalizeHandle(item?.username)));
          const uniqueCandidates = combinedCandidates.filter((item) => !seen.has(normalizeHandle(item?.username)));
          const appended = uniqueCandidates.slice(0, 6);
          appendedCount = appended.length;
          appendedHandles = appended.map((item) => item?.username).filter(Boolean);
          if (appended.length > 0) {
            setAiSearchResults((prev) => [...prev, ...appended]);
          }
        }
        if (appendedCount === 0) {
          const seen = new Set([
            ...watchlist.map((item) => normalizeHandle(item?.username)),
            ...aiSearchResults.map((item) => normalizeHandle(item?.username)),
            ...aiSearchSeenUsernames.map(normalizeHandle),
          ]);
          const fallbackExperts = buildAudienceFallbackExperts(query)
            .filter((item) => !seen.has(normalizeHandle(item?.username)))
            .slice(0, 6);

          if (fallbackExperts.length > 0) {
            appendedCount = fallbackExperts.length;
            appendedHandles = fallbackExperts.map((item) => item?.username).filter(Boolean);
            setAiSearchResults((prev) => [...prev, ...fallbackExperts]);
          }
        }
      } else {
        setAiSearchResults(nextExperts);
      }
      if (isMore) {
        setAiSearchOverflowResults((prev) => {
          const seen = new Set([
            ...aiSearchResults.map((item) => normalizeHandle(item?.username)),
            ...nextExperts.map((item) => normalizeHandle(item?.username)),
          ]);
          const queued = [...prev, ...combinedCandidates]
            .filter((item) => !seen.has(normalizeHandle(item?.username)));
          const deduped = [];
          const queuedSeen = new Set();
          queued.forEach((item) => {
            const handle = normalizeHandle(item?.username);
            if (!handle || queuedSeen.has(handle)) return;
            queuedSeen.add(handle);
            deduped.push(item);
          });
          return deduped;
        });
      } else {
        setAiSearchOverflowResults(overflowExperts);
      }
      setAiSearchSeenUsernames(prev => {
        const nextSeen = [
          ...(isMore ? prev : []),
          ...nextExperts.map(u => u.username).filter(Boolean),
          ...overflowExperts.map(u => u.username).filter(Boolean),
          ...appendedHandles,
        ];
        return Array.from(new Set(nextSeen));
      });
      if (!isMore) setHasSearchedAudience(true);
      return appendedCount;
    } catch (err) {
      console.error(err);
      return 0;
    }
  };

  const handleManualSearch = async (e) => {
    if (e) e.preventDefault();
    try {
      await manualSearchMutation.mutateAsync(manualQuery);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddUser = (user) => {
    if (!hasWatchlistRoomFor(user?.username)) return;
    addUserToWatchlist(user);
    setManualPreview(null);
    setManualQuery('');
  };

  return {
    audienceTab,
    setAudienceTab,
    aiQuery,
    setAiQuery,
    aiSearchLoading: aiSearchMutation.isPending,
    aiSearchResults,
    aiSearchHasMore: hasSearchedAudience && aiSearchResults.length > 0,
    setAiSearchResults: (nextResults) => {
      setAiSearchResults(nextResults);
      setAiSearchOverflowResults([]);
      setAiSearchSeenUsernames([]);
    },
    hasSearchedAudience,
    manualQuery,
    setManualQuery,
    manualPreview,
    handleAiSearchAudience,
    handleManualSearch,
    handleAddUser,
  };
};
