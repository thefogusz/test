import { createXai } from '@ai-sdk/xai';
import { generateObject, generateText, streamText } from 'ai';
import { z } from 'zod';
import { getUserInfo, searchEverything } from './TwitterService';

const MODEL_NEWS_FAST = 'grok-4-1-fast-non-reasoning';
const MODEL_REASONING_FAST = 'grok-4-1-fast-reasoning';
const MODEL_WRITER = 'grok-4.20-beta-latest-non-reasoning';
const MODEL_MULTI_AGENT = 'grok-4.20-multi-agent';

const grok = createXai({
  apiKey: 'local-proxy',
  baseURL: '/api/xai/v1',
});

const factCache = new Map();

const SUMMARY_RULES = `
You convert social posts into short Thai news summaries.

Rules:
- Preserve the original meaning.
- Write the summary in Thai.
- Keep English proper nouns, product names, and technical terms in English.
- Do not mention Twitter or X by name.
- Do not include URLs.
- Keep each summary to 1-2 sentences.
- Avoid hype, certainty inflation, and extra assumptions.
`.trim();

const cleanMarkdown = (text = '') =>
  text
    .replace(/^#\s*(Introduction|Intro|Overview).*\n?/gim, '')
    .replace(/^#\s*(Conclusion|Summary).*$/gim, '## Summary')
    .trim();

const dedupeSources = (sources = []) => {
  const byUrl = new Map();

  for (const source of sources) {
    if (!source?.url) continue;
    if (!byUrl.has(source.url)) {
      byUrl.set(source.url, {
        title: source.title || source.url,
        url: source.url,
      });
    }
  }

  return Array.from(byUrl.values());
};

const buildTweetUrl = (tweet) => {
  if (!tweet?.id) return null;
  const username = tweet.author?.username || 'i';
  return `https://x.com/${username}/status/${tweet.id}`;
};

const getTweetEngagementScore = (tweet) => {
  const likes = Number(tweet?.like_count || 0);
  const reposts = Number(tweet?.retweet_count || 0);
  const replies = Number(tweet?.reply_count || 0);
  const views = Number(tweet?.view_count || 0);

  return likes + reposts * 2 + replies * 1.5 + views / 1000;
};

const extractSourcesFromTweets = (tweets, limit = 4) =>
  dedupeSources(
    (tweets || [])
      .slice(0, limit)
      .map((tweet) => {
        const url = buildTweetUrl(tweet);
        if (!url) return null;

        return {
          title: `@${tweet.author?.username || 'unknown'} on X`,
          url,
        };
      })
      .filter(Boolean),
  );

const toTweetEvidence = (tweets, limit = 6) =>
  (tweets || [])
    .slice(0, limit)
    .map((tweet, index) => {
      const url = buildTweetUrl(tweet);
      const username = tweet.author?.username || 'unknown';
      const text = (tweet.text || '').replace(/\s+/g, ' ').trim();
      const clipped = text.length > 280 ? `${text.slice(0, 277)}...` : text;
      return `[X${index + 1}] @${username}: ${clipped}${url ? ` (${url})` : ''}`;
    })
    .join('\n');

const normalizeLength = (value) => {
  const raw = String(value || '').trim().toLowerCase();

  if (raw === 'short' || raw.includes('short')) return 'short';
  if (raw === 'long' || raw.includes('long')) return 'long';

  return 'medium';
};

const getLengthInstruction = (value) => {
  switch (normalizeLength(value)) {
    case 'short':
      return 'Keep it tight: one short paragraph or 3-4 short lines, usually under 150 words.';
    case 'long':
      return 'Write a full long-form piece, usually 700-900+ words, with real depth and a strong conclusion.';
    case 'medium':
    default:
      return 'Write a medium-length piece, usually 350-500 words, with enough detail to feel complete.';
  }
};

const callGrok = async ({
  system,
  prompt,
  modelName = MODEL_NEWS_FAST,
  useResponses = false,
  providerOptions,
  temperature,
}) => {
  try {
    const { text } = await generateText({
      model: useResponses ? grok.responses(modelName) : grok(modelName),
      system,
      prompt,
      providerOptions,
      ...(typeof temperature === 'number' ? { temperature } : {}),
    });

    return text.trim();
  } catch (error) {
    console.error(`[GrokService] Error calling ${modelName}:`, error);
    throw error;
  }
};

const deriveResearchQuery = async (input) => {
  const fallback = (input || '').replace(/\s+/g, ' ').trim().slice(0, 160);

  if (!fallback) return '';

  try {
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system:
        'Extract one concise search query from the request. Preserve important names, products, companies, and topics. Return only JSON.',
      prompt: input,
      schema: z.object({
        searchQuery: z.string().min(3).max(160),
      }),
    });

    return object.searchQuery.trim();
  } catch (error) {
    console.warn('[GrokService] Falling back to raw research query:', error);
    return fallback;
  }
};

const rankExpertCandidates = (tweets, excludeUsernames = []) => {
  const excluded = new Set(
    (excludeUsernames || []).map((username) => String(username || '').toLowerCase()),
  );
  const candidates = new Map();

  for (const tweet of tweets || []) {
    const username = String(tweet.author?.username || '').trim();
    if (!username) continue;

    const key = username.toLowerCase();
    if (excluded.has(key)) continue;

    const entry = candidates.get(key) || {
      name: tweet.author?.name || username,
      username,
      appearances: 0,
      engagementScore: 0,
      latestTimestamp: 0,
      samplePosts: [],
    };

    entry.appearances += 1;
    entry.engagementScore += getTweetEngagementScore(tweet);

    const timestamp = new Date(tweet.created_at || 0).getTime();
    if (Number.isFinite(timestamp)) {
      entry.latestTimestamp = Math.max(entry.latestTimestamp, timestamp);
    }

    if (entry.samplePosts.length < 2 && tweet.text) {
      entry.samplePosts.push(tweet.text.replace(/\s+/g, ' ').trim());
    }

    candidates.set(key, entry);
  }

  return Array.from(candidates.values())
    .sort((a, b) => {
      const scoreDelta =
        b.engagementScore + b.appearances * 25 - (a.engagementScore + a.appearances * 25);
      if (scoreDelta !== 0) return scoreDelta;
      return b.latestTimestamp - a.latestTimestamp;
    })
    .slice(0, 12);
};

const hydrateExperts = async (candidates) => {
  const hydrated = await Promise.all(
    (candidates || []).map(async (candidate) => {
      try {
        const user = await getUserInfo(candidate.username);
        return {
          ...candidate,
          name: user?.name || candidate.name,
          username: user?.username || candidate.username,
          description: user?.description || '',
        };
      } catch {
        return {
          ...candidate,
          description: '',
        };
      }
    }),
  );

  return hydrated;
};

// --- [NEWS FLOW FUNCTIONS] ---

export const generateGrokSummary = async (fullStoryText) => {
  const results = await generateGrokBatch([fullStoryText]);
  return results[0] || fullStoryText;
};

export const generateGrokBatch = async (stories) => {
  if (!stories || stories.length === 0) return [];

  try {
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system: SUMMARY_RULES,
      prompt: JSON.stringify({
        count: stories.length,
        stories,
        outputRule: 'Return one Thai summary for each input in the same order.',
      }),
      schema: z.object({
        summaries: z.array(z.string()).length(stories.length),
      }),
      temperature: 0.2,
    });

    return object.summaries.map((summary) => summary.trim());
  } catch (error) {
    console.error('[GrokService] Batch summarization error:', error);
    return stories.map(() => '(Grok API Error)');
  }
};

export const agentFilterFeed = async (tweetsData, userPrompt) => {
  if (!tweetsData?.length) return [];

  const compressedInput = tweetsData.map((tweet) => ({
    id: tweet.id,
    text: tweet.text,
    username: tweet.author?.username || null,
  }));

  try {
    const { object } = await generateObject({
      model: grok(MODEL_NEWS_FAST),
      system: `Select only the posts that match this user intent: "${userPrompt}".
Return IDs only. Remove spam, scams, engagement bait, duplicates, and off-topic posts.`,
      prompt: JSON.stringify(compressedInput),
      schema: z.object({
        validIds: z.array(z.string()),
      }),
      temperature: 0,
    });

    const validIdSet = new Set(compressedInput.map((tweet) => tweet.id));
    return object.validIds.filter((id) => validIdSet.has(id));
  } catch (error) {
    console.error('[GrokService] Filter error:', error);
    return tweetsData.map((tweet) => tweet.id);
  }
};

export const generateExecutiveSummary = async (validTweets, userQuery) => {
  if (!validTweets?.length) return null;

  const contentToAnalyze = validTweets
    .slice(0, 10)
    .map((tweet, index) => `[${index + 1}] ${tweet.text}`)
    .join('\n---\n');

  return callGrok({
    modelName: MODEL_REASONING_FAST,
    system: `You are an analyst writing a concise Thai executive summary for "${userQuery}".
Write 2-3 sentences in Thai. Highlight only the most defensible takeaways.
Use markdown bold for the most important phrase if helpful. No heading.`,
    prompt: contentToAnalyze,
    providerOptions: {
      xai: {
        reasoningEffort: 'medium',
      },
    },
  });
};

export const expandSearchQuery = async (originalQuery, isLatest = false) => {
  if (!originalQuery) return originalQuery;

  const today = new Date().toISOString().split('T')[0];

  try {
    const { object } = await generateObject({
      model: grok(MODEL_REASONING_FAST),
      system: `Rewrite the user's topic into X advanced search syntax.
Rules:
- Keep the original topic intent.
- Expand with close synonyms or related terms using OR when useful.
- Always include -filter:replies exactly once.
- ${isLatest ? `Add since:${today} for recency.` : 'Bias toward high-signal posts suitable for Top results.'}
- Return JSON only.`,
      prompt: `Topic: ${originalQuery}`,
      schema: z.object({
        finalXQuery: z.string().min(3),
      }),
      providerOptions: {
        xai: {
          reasoningEffort: 'medium',
        },
      },
    });

    const finalQuery = object.finalXQuery.replace(/\s+/g, ' ').trim();
    return finalQuery.includes('-filter:replies')
      ? finalQuery
      : `${finalQuery} -filter:replies`;
  } catch (error) {
    console.error('[GrokService] Query optimizer error:', error);
    return `${originalQuery} -filter:replies`;
  }
};

export const discoverTopExperts = async (categoryQuery, excludeUsernames = []) => {
  const fallbackReasoning = (candidate) =>
    `Grounded pick for ${categoryQuery}: ${candidate.appearances} relevant posts with strong engagement from real X search results.`;

  try {
    const [topQuery, latestQuery] = await Promise.all([
      expandSearchQuery(categoryQuery, false).catch(() => `${categoryQuery} -filter:replies`),
      expandSearchQuery(categoryQuery, true).catch(() => `${categoryQuery} -filter:replies`),
    ]);

    const [topResults, latestResults] = await Promise.all([
      searchEverything(topQuery, '', true, 'Top').catch(() => ({ data: [] })),
      searchEverything(latestQuery, '', true, 'Latest').catch(() => ({ data: [] })),
    ]);

    const mergedTweets = [...(topResults.data || []), ...(latestResults.data || [])];
    const rankedCandidates = rankExpertCandidates(mergedTweets, excludeUsernames);

    if (!rankedCandidates.length) return [];

    const hydratedCandidates = await hydrateExperts(rankedCandidates);
    const candidateLookup = new Map(
      hydratedCandidates.map((candidate) => [candidate.username.toLowerCase(), candidate]),
    );

    try {
      const { object } = await generateObject({
        model: grok(MODEL_REASONING_FAST),
        system: `Choose the best X accounts to follow for the topic "${categoryQuery}".
Use ONLY usernames from the candidate list.
Never invent or modify usernames.
Prefer accounts that are active, authoritative, and repeatedly visible in the evidence.`,
        prompt: JSON.stringify({
          topic: categoryQuery,
          candidates: hydratedCandidates.map((candidate) => ({
            name: candidate.name,
            username: candidate.username,
            description: candidate.description,
            appearances: candidate.appearances,
            engagementScore: Math.round(candidate.engagementScore),
            samplePosts: candidate.samplePosts,
          })),
        }),
        schema: z.object({
          experts: z.array(
            z.object({
              username: z.string(),
              reasoning: z.string().min(10).max(220),
            }),
          ).max(6),
        }),
        providerOptions: {
          xai: {
            reasoningEffort: 'medium',
          },
        },
      });

      const finalExperts = [];

      for (const expert of object.experts) {
        const candidate = candidateLookup.get(expert.username.toLowerCase());
        if (!candidate) continue;
        if (finalExperts.some((item) => item.username.toLowerCase() === candidate.username.toLowerCase())) {
          continue;
        }

        finalExperts.push({
          name: candidate.name,
          username: candidate.username,
          reasoning: expert.reasoning.trim(),
        });
      }

      if (finalExperts.length > 0) {
        return finalExperts.slice(0, 6);
      }
    } catch (error) {
      console.warn('[GrokService] Expert ranking fell back to heuristics:', error);
    }

    return hydratedCandidates.slice(0, 6).map((candidate) => ({
      name: candidate.name,
      username: candidate.username,
      reasoning: fallbackReasoning(candidate),
    }));
  } catch (error) {
    console.error('[GrokService] Expert discovery error:', error);
    return [];
  }
};

export const researchContext = async (query, interactionData = '') => {
  const { factSheet } = await researchAndPreventHallucination(
    [query, interactionData].filter(Boolean).join('\n\n'),
  );
  return factSheet;
};

// --- [CONTENT FLOW FUNCTIONS] ---

export const researchAndPreventHallucination = async (input) => {
  if (factCache.has(input)) return factCache.get(input);

  const researchQuery = await deriveResearchQuery(input);
  let webContext = '';
  let xContext = '';
  let extractedSources = [];

  try {
    const [webResponse, xTopResponse, xLatestResponse] = await Promise.all([
      fetch('/api/tavily/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: researchQuery,
          search_depth: 'advanced',
          include_answer: true,
          max_results: 5,
        }),
      }),
      searchEverything(researchQuery, '', false, 'Top').catch(() => ({ data: [] })),
      searchEverything(researchQuery, '', false, 'Latest').catch(() => ({ data: [] })),
    ]);

    if (webResponse.ok) {
      const data = await webResponse.json();
      const webResults = Array.isArray(data.results) ? data.results : [];

      extractedSources.push(
        ...webResults.map((result) => ({
          title: result.title || result.url,
          url: result.url,
        })),
      );

      webContext = [
        data.answer ? `[WEB ANSWER]\n${data.answer}` : '',
        webResults.length
          ? `[WEB SOURCES]\n${webResults
              .map((result, index) => {
                const snippet = (result.content || result.raw_content || '')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 320);
                return `${index + 1}. ${result.title} - ${snippet} (${result.url})`;
              })
              .join('\n')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');
    }

    const xTweets = [...(xTopResponse.data || []).slice(0, 4), ...(xLatestResponse.data || []).slice(0, 4)];
    extractedSources.push(...extractSourcesFromTweets(xTweets, 6));

    if (xTweets.length) {
      xContext = `[X EVIDENCE]\n${toTweetEvidence(xTweets, 6)}`;
    }
  } catch (error) {
    console.error('[GrokService] Search aggregation error:', error);
  }

  const factSheet = await callGrok({
    modelName: MODEL_REASONING_FAST,
    system: `You are a Thai research desk preparing a grounded fact sheet.
Use only the supplied evidence.
If something is not supported clearly, mark it as uncertain.
Write in Thai, but keep proper nouns and product names in English.

Format:
## Verified Facts
- ...
## Market / Community Signals
- ...
## Caveats / Unknowns
- ...
## Suggested Angles
- ...
`,
    prompt: [
      `[ORIGINAL REQUEST]\n${input}`,
      `[SEARCH QUERY]\n${researchQuery}`,
      webContext,
      xContext,
    ]
      .filter(Boolean)
      .join('\n\n'),
    providerOptions: {
      xai: {
        reasoningEffort: 'high',
      },
    },
  });

  const resultPayload = {
    factSheet,
    sources: dedupeSources(extractedSources).slice(0, 8),
  };

  factCache.set(input, resultPayload);
  return resultPayload;
};

export const generateStructuredContent = async (
  factSheet,
  length,
  tone,
  format,
  onStreamChunk,
) => {
  const lengthInstruction = getLengthInstruction(length);

  const draftSystemPrompt = `You are a professional Thai writer.
Write only from the provided fact sheet.

Target format: ${format}
Tone: ${tone}
Length: ${lengthInstruction}

Rules:
1. Do not invent facts, numbers, names, timelines, or quotes.
2. Keep English proper nouns in English.
3. Do not include source URLs in the body text.
4. If evidence is mixed, use careful wording.
5. For short output, avoid headings.
6. For medium and long output, use markdown headings and end with "## Summary".`;

  const draftUserPrompt = `[FACT SHEET]\n${factSheet}\n\nWrite the final Thai content now.`;

  if (onStreamChunk) {
    try {
      const { textStream } = await streamText({
        model: grok(MODEL_WRITER),
        system: draftSystemPrompt,
        prompt: draftUserPrompt,
        temperature: 0.7,
      });

      let fullContent = '';
      for await (const textPart of textStream) {
        fullContent += textPart;
        onStreamChunk(cleanMarkdown(fullContent));
      }

      return cleanMarkdown(fullContent);
    } catch (error) {
      console.error('[GrokService] Streaming error:', error);
      throw error;
    }
  }

  const contentDraft = await callGrok({
    modelName: MODEL_WRITER,
    system: draftSystemPrompt,
    prompt: draftUserPrompt,
    temperature: 0.7,
  });

  try {
    const { object: evalResult } = await generateObject({
      model: grok(MODEL_REASONING_FAST),
      system: `Check whether the draft stays faithful to the fact sheet.
Return passed=true only if the draft is grounded and on-tone.
If it fails, give one short reason.`,
      prompt: `[FACT SHEET]\n${factSheet}\n\n[DRAFT]\n${contentDraft}`,
      schema: z.object({
        passed: z.boolean(),
        reason: z.string().optional(),
      }),
      providerOptions: {
        xai: {
          reasoningEffort: 'medium',
        },
      },
    });

    if (!evalResult.passed) {
      return cleanMarkdown(
        await callGrok({
          modelName: MODEL_WRITER,
          system: draftSystemPrompt,
          prompt: `[FACT SHEET]\n${factSheet}\n\n[CURRENT DRAFT]\n${contentDraft}\n\n[EDITOR FEEDBACK]\n${
            evalResult.reason || 'Tighten accuracy and tone.'
          }\n\nRewrite the content so it stays fully grounded.`,
          temperature: 0.4,
        }),
      );
    }
  } catch (error) {
    console.warn('[GrokService] Editor pass skipped:', error);
  }

  return cleanMarkdown(contentDraft);
};

export const generateFinalContent = async (enrichedData, targetFormat, customPrompt = '') => {
  try {
    return await callGrok({
      modelName: MODEL_MULTI_AGENT,
      useResponses: true,
      system: `Create a polished Thai piece in the format "${targetFormat}".
Stay grounded in the provided material only.`,
      prompt: `[RESEARCH]\n${enrichedData}\n\n[EXTRA INSTRUCTIONS]\n${customPrompt || 'None'}`,
      providerOptions: {
        xai: {
          reasoningEffort: 'medium',
        },
      },
    });
  } catch (error) {
    console.warn('[GrokService] Multi-agent fallback triggered:', error);
    return callGrok({
      modelName: MODEL_WRITER,
      system: `Create a polished Thai piece in the format "${targetFormat}".
Stay grounded in the provided material only.`,
      prompt: `[RESEARCH]\n${enrichedData}\n\n[EXTRA INSTRUCTIONS]\n${customPrompt || 'None'}`,
    });
  }
};

export const generateContentArticle = generateFinalContent;
export const generateArticle = generateFinalContent;
