
const getEngagementTotal = (post) =>
  (parseInt(post?.retweet_count) || 0) +
  (parseInt(post?.reply_count) || 0) +
  (parseInt(post?.like_count) || 0) +
  (parseInt(post?.quote_count) || 0);

const deriveVisibleFeed = ({
  activeFilters,
  result
}) => {
  if (activeFilters.view || activeFilters.engagement) {
    return [...result].sort((left, right) => {
      const leftScore =
        (activeFilters.view ? parseInt(left.view_count) || 0 : 0) +
        (activeFilters.engagement ? getEngagementTotal(left) : 0);
      const rightScore =
        (activeFilters.view ? parseInt(right.view_count) || 0 : 0) +
        (activeFilters.engagement ? getEngagementTotal(right) : 0);

      return rightScore - leftScore;
    });
  }
  return result;
};

const mockFeed = [
    { id: '1', view_count: '100', like_count: '10', retweet_count: '5', reply_count: '2', quote_count: '1' },
    { id: '2', view_count: '200', like_count: '5', retweet_count: '2', reply_count: '1', quote_count: '0' },
    { id: '3', view_count: 50, like_count: 50, retweet_count: 20, reply_count: 10, quote_count: 5 }, // integer
    { id: '4', view_count: undefined, like_count: '0', retweet_count: '0', reply_count: '0', quote_count: '0' }
];

console.log("Only Views:");
console.log(deriveVisibleFeed({ activeFilters: { view: true, engagement: false }, result: mockFeed }).map(f => f.id));

console.log("Only Engagement:");
console.log(deriveVisibleFeed({ activeFilters: { view: false, engagement: true }, result: mockFeed }).map(f => f.id));

console.log("Both:");
console.log(deriveVisibleFeed({ activeFilters: { view: true, engagement: true }, result: mockFeed }).map(f => f.id));
