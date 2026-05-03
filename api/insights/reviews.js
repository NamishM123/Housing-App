// Pulls real-people commentary about a neighborhood from Reddit search.
// We hit r/SanLuisObispo and r/CalPoly first (most relevant for SLO-area
// listings), then fall back to a site-wide search if those come up empty.
//
// No auth needed for the public search.json endpoint, but Reddit rate-limits
// aggressively per IP. We cache responses in-memory for 1 hour to avoid
// hammering Reddit on every panel open.

import axios from 'axios';

const TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map(); // key → { ts, data }

const SUBREDDITS = ['SanLuisObispo', 'CalPoly'];

// Reddit blocks default UAs. They want a descriptive UA per their API guidelines.
const USER_AGENT = 'web:settlr-housing-app:v1.0 (real-people-reviews)';

function pickKeywords(neighborhoodName) {
  // Strip "SLO" / generic suffixes for a tighter search query
  return neighborhoodName.replace(/\s*SLO\s*$/i, '').replace(/\s*Area$/i, '').trim();
}

async function searchSubreddit(sub, query) {
  const url = `https://www.reddit.com/r/${sub}/search.json`;
  const { data } = await axios.get(url, {
    params: {
      q: query,
      restrict_sr: 1,
      sort: 'relevance',
      limit: 12,
      t: 'year', // last year only — keeps content fresh
      raw_json: 1,
    },
    headers: { 'User-Agent': USER_AGENT },
    timeout: 8000,
  });
  return data?.data?.children || [];
}

async function searchAll(query) {
  const url = 'https://www.reddit.com/search.json';
  const { data } = await axios.get(url, {
    params: { q: `${query} (rent OR landlord OR apartment OR neighborhood)`, sort: 'relevance', limit: 12, raw_json: 1 },
    headers: { 'User-Agent': USER_AGENT },
    timeout: 8000,
  });
  return data?.data?.children || [];
}

function normalize(child) {
  const p = child?.data || {};
  const text = (p.selftext || p.title || '').trim();
  if (!text) return null;
  return {
    id: p.id,
    subreddit: p.subreddit_name_prefixed || `r/${p.subreddit}`,
    author: p.author && p.author !== '[deleted]' ? `u/${p.author}` : 'anonymous',
    title: p.title,
    snippet: text.length > 320 ? text.slice(0, 317) + '…' : text,
    url: `https://www.reddit.com${p.permalink}`,
    score: p.score ?? 0,
    numComments: p.num_comments ?? 0,
    createdUtc: p.created_utc,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { neighborhood } = req.query;
  if (!neighborhood) return res.status(400).json({ error: 'neighborhood required' });

  const cacheKey = neighborhood.toLowerCase();
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.ts < TTL_MS) {
    return res.json({ ...cached.data, cached: true });
  }

  const query = pickKeywords(neighborhood);

  try {
    // Hit each SLO-relevant sub in parallel
    const subResults = await Promise.allSettled(
      SUBREDDITS.map(s => searchSubreddit(s, query)),
    );
    let children = subResults.flatMap(r => r.status === 'fulfilled' ? r.value : []);

    // If too thin, broaden to site-wide search
    if (children.length < 3) {
      try {
        const globalResults = await searchAll(query);
        children = children.concat(globalResults);
      } catch { /* swallow — we'll just return what we have */ }
    }

    const seen = new Set();
    const reviews = children
      .map(normalize)
      .filter(Boolean)
      .filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 8);

    const payload = { neighborhood, query, reviews, source: 'reddit' };
    cache.set(cacheKey, { ts: now, data: payload });
    return res.json(payload);
  } catch (err) {
    // Reddit rate-limited, blocked, or down. Return empty list rather than 500
    // so the UI shows a clean "no discussions" state instead of an error.
    const status = err?.response?.status;
    return res.status(200).json({
      neighborhood,
      query,
      reviews: [],
      source: 'reddit',
      error: status === 429 ? 'rate_limited' : 'unavailable',
    });
  }
}
