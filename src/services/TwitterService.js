const TWITTER_API_KEY = import.meta.env.VITE_TWITTER_API_KEY;
const BASE_URL = '/twitter-api/twitter';

/**
 * FEATURE 1: User Verification
 */
export const getUserInfo = async (username) => {
  try {
    const handle = username.startsWith('@') ? username.substring(1) : username;
    const response = await fetch(`${BASE_URL}/user/info?userName=${handle}`, {
      method: 'GET',
      headers: { 'X-API-Key': TWITTER_API_KEY }
    });
    if (!response.ok) throw new Error('User not found');
    const result = await response.json();
    
    if (result.status === 'success' && result.data) {
      const u = result.data;
      // Normalizing for frontend consistency
      return {
        id: u.id,
        username: u.userName, // normalized
        name: u.name,
        profile_image_url: u.profilePicture, // normalized
        description: u.description
      };
    }
    throw new Error('User data missing');
  } catch (error) {
    console.error('Error in getUserInfo:', error);
    throw error;
  }
};

/**
 * FEATURE 2: Optimized Feed Fetching with Batching
 */
export const fetchForoFeed = async (watchlistHandles) => {
  const date = new Date();
  date.setDate(date.getDate() - 2); // 2 days ago for better coverage
  const sinceDate = date.toISOString().split('T')[0];
  
  const batches = [];
  const validHandles = watchlistHandles.filter(h => h && h !== 'undefined');
  
  for (let i = 0; i < validHandles.length; i += 15) {
    batches.push(validHandles.slice(i, i + 15));
  }
  
  let allTweets = [];
  for (const batch of batches) {
    // Removing -filter:replies to capture more content as requested by user
    const query = `(${batch.map(u => `from:${u}`).join(' OR ')}) since:${sinceDate}`;
    const response = await fetch(`${BASE_URL}/tweet/advanced_search?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: { 'X-API-Key': TWITTER_API_KEY }
    });
    const data = await response.json();
    allTweets = [...allTweets, ...(data.tweets || [])];
  }
  
  return allTweets;
};

/**
 * FEATURE 2: Thread Reconstruction
 */
export const getThreadContext = async (conversationId, authorId) => {
  try {
    const response = await fetch(`${BASE_URL}/tweet/thread/context?conversationId=${conversationId}`, {
      method: 'GET',
      headers: { 'X-API-Key': TWITTER_API_KEY }
    });
    const data = await response.json();
    const thread = data.tweets || [];
    
    // Filter logic: only keep tweets from the same author
    return thread.filter(t => t.author?.id === authorId)
                 .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } catch (error) {
    console.error('Error in getThreadContext:', error);
    return [];
  }
};
