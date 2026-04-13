const fs = require('fs');
const path = 'D:/TEST/src/hooks/useHomeFeedWorkspace.ts';
let content = fs.readFileSync(path, 'utf8');
const replacement = `  const processAndSummarizeFeed = async (newBatch: any[], statusPrefix = 'พบ') => {
    if (newBatch.length === 0 || isSummarizingRef.current) return;
    isSummarizingRef.current = true;

    const CHUNK_SIZE = 20;
    const totalChunks = Math.ceil(newBatch.length / CHUNK_SIZE);
    let runningFeed = [...originalFeed];

    try {
      for (let index = 0; index < newBatch.length; index += CHUNK_SIZE) {
        const chunkIndex = Math.floor(index / CHUNK_SIZE) + 1;
        setStatus(\`${'${statusPrefix}'} ${'${newBatch.length}'} โพสต์ — กำลังแสดงผล ${'${chunkIndex}'} / ${'${totalChunks}'}...\`);

        const chunk = newBatch.slice(index, index + CHUNK_SIZE);
        const preSummaryChunk = chunk.map((post) => sanitizeStoredPost(post));

        setOriginalFeed((prev) => {
          const postMap = new Map(prev.map((post) => [post.id, post]));

          preSummaryChunk.forEach((newPost) => {
            if (postMap.has(newPost.id)) {
              postMap.set(newPost.id, {
                ...sanitizeStoredPost(postMap.get(newPost.id)),
                ...newPost,
              });
            } else {
              postMap.set(newPost.id, newPost);
            }
          });

          const nextList = Array.from(postMap.values()).sort(
            (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
          );
          runningFeed = nextList;
          return nextList;
        });

        setReadArchive((prev) => {
          const existingIds = new Set(prev.map((post) => post.id));
          const newItems = preSummaryChunk.filter((post) => !existingIds.has(post.id));
          if (newItems.length > 0) return [...newItems, ...prev];
          return prev;
        });

        const toSummarize = preSummaryChunk.filter((tweet) => {
          const existing = runningFeed.find((post) => post.id === tweet.id) || tweet;
          if (isThaiNativeRssPost(existing)) return false;
          return !hasUsefulThaiSummary(
            existing.summary,
            getPostSummarySourceText(existing),
          );
        });

        if (toSummarize.length > 0) {
          const translatedPosts = await translatePostsToThai(toSummarize, {
            retrySingles: chunkIndex === 1,
            maxRetryCount: 2,
          });
          const translatedSummaryMap = new Map(
            translatedPosts
              .filter((post) => hasUsefulThaiSummary(post.summary, getPostSummarySourceText(post)))
              .map((post) => [post.id, post.summary]),
          );

          if (translatedSummaryMap.size > 0) {
            setOriginalFeed((prev) =>
              prev.map((post) =>
                translatedSummaryMap.has(post.id)
                  ? { ...post, summary: translatedSummaryMap.get(post.id) }
                  : post,
              ),
            );
            setReadArchive((prev) =>
              prev.map((post) =>
                translatedSummaryMap.has(post.id)
                  ? { ...post, summary: translatedSummaryMap.get(post.id) }
                  : post,
              ),
            );
            runningFeed = runningFeed.map((post) =>
              translatedSummaryMap.has(post.id)
                ? { ...post, summary: translatedSummaryMap.get(post.id) }
                : post,
            );
          }
        }
      }
    } finally {
      isSummarizingRef.current = false;
    }
  };`;
content = content.replace(/  const processAndSummarizeFeed = async \(newBatch: any\[], statusPrefix = '[^']*'\) => \{[\s\S]*?^  \};/m, replacement);
fs.writeFileSync(path, content, 'utf8');
