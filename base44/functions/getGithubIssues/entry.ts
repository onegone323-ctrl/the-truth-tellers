import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Lists open issues for the Oracle codebase via the GitHub connector.
// The connector is the builder's shared account, so this is admin-only.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const repo = String(body?.repo || 'onegone323-ctrl/the-truth-tellers');
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
      return Response.json({ error: 'Invalid repo name' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');
    const res = await fetch(
      `https://api.github.com/repos/${repo}/issues?state=open&sort=updated&direction=desc&per_page=30`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'truth-teller-oracle',
        },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) {
      const detail = await res.text();
      return Response.json({ error: 'GitHub API ' + res.status + ': ' + detail.slice(0, 300) }, { status: 502 });
    }
    const raw = await res.json();
    // Pull requests also appear here — filter them out.
    const issues = raw.filter((i) => !i.pull_request);

    return Response.json({
      repo,
      open_count: issues.length,
      issues: issues.map((i) => ({
        number: i.number,
        title: i.title,
        author: i.user?.login || 'unknown',
        labels: (i.labels || []).map((l) => ({ name: l.name, color: '#' + (l.color || 'd4af37') })),
        comments: i.comments || 0,
        created: i.created_at,
        updated: i.updated_at,
        url: i.html_url,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}