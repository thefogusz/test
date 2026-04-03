export interface AuthorProfile {
  description?: string;
}

export interface Author {
  id?: string;
  username?: string;
  userName?: string;
  name?: string;
  description?: string;
  profile_bio?: AuthorProfile;
  profile_image_url?: string;
  profilePicture?: string;
  followers?: number | string;
  fastFollowersCount?: number | string;
  isVerified?: boolean;
  isBlueVerified?: boolean;
  verifiedType?: string;
  createdAt?: string;
  statusesCount?: number | string;
  location?: string;
  isAutomated?: boolean;
}

export interface ContentSource {
  citation_id?: string;
  title?: string;
  url: string;
  content?: string;
  raw_content?: string;
  snippet?: string;
}

export interface AttachedSource {
  id?: string | null;
  sourceType?: string;
  isXVideo?: boolean;
  supportsVideoAnalysis?: boolean;
  title?: string;
  text?: string;
  summary?: string;
  url?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  primaryImageUrl?: string;
  imageUrls?: string[];
  videoDurationMs?: number;
  videoTranscript?: string;
  videoAnalysis?: string;
  author?: {
    name?: string;
    username?: string;
    profile_image_url?: string;
  } | null;
}

export interface Post {
  id?: string;
  type?: string;
  sourceType?: string;
  isXVideo?: boolean;
  supportsVideoAnalysis?: boolean;
  text?: string;
  full_text?: string;
  summary?: string;
  title?: string;
  url?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  primaryImageUrl?: string;
  imageUrls?: string[];
  videoDurationMs?: number;
  videoTranscript?: string;
  videoAnalysis?: string;
  citation_id?: string;
  created_at?: string;
  createdAt?: string;
  author?: Author | null;
  like_count?: number | string;
  likeCount?: number | string;
  view_count?: number | string;
  viewCount?: number | string;
  retweet_count?: number | string;
  retweetCount?: number | string;
  reply_count?: number | string;
  replyCount?: number | string;
  quote_count?: number | string;
  quoteCount?: number | string;
  temporalTag?: string;
  ai_reasoning?: string;
  isReply?: boolean;
  inReplyToUsername?: string;
  inReplyToStatusId?: string;
  search_score?: number;
  velocityTag?: string | null;
  attachedSource?: AttachedSource | null;
  sources?: ContentSource[];
}

export interface SavedArticle extends Post {
  type: 'article';
  title: string;
  summary: string;
  created_at: string;
}

export interface WatchlistUser {
  id: string;
  username: string;
  name?: string;
  profile_image_url?: string;
  description?: string;
  isPlaceholder?: boolean;
}

export interface PostList {
  id: string;
  name: string;
  members: string[];
  color?: string;
}

export interface SearchHistoryEntry {
  query: string;
  count: number;
  lastUsedAt: string;
}

export type ActiveView = 'home' | 'content' | 'read' | 'audience' | 'bookmarks' | 'search';
export type ContentTab = 'search' | 'create';
