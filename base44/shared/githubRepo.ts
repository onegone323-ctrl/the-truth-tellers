// Shared GitHub access for the admin code views (issue ledger + pull requests):
// one repo-name check and one request path, so the two functions behave the same.

const REPO = /^[A-Za-z0-9][\w.-]{0,99}\/[A-Za-z0-9][\w.-]{0,99}$/;

// Returns the repo to query ('owner/name'), or null when the name isn't a plain
// owner/name (no '..', no slashes inside a segment) — the name goes into the URL.
export function normalizeRepo(input, fallback) {
  const raw = typeof input === 'string' && input.trim() ? input.trim() : fallback;
  return REPO.test(raw) ? raw : null;
}

// A GET against the GitHub API as the connected account. The provider's raw
// error body stays server-side (it names repos and accounts); callers get null.
export async function githubGet(base44, path, logLabel) {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'truth-teller-oracle',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.error(`${logLabel}: GitHub rejected request`, {
      path,
      status: res.status,
      body: (await res.text()).slice(0, 300),
    });
    return null;
  }
  return await res.json();
}