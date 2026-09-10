import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Lists pull requests for the Oracle codebase via the GitHub connector.
// The connector is the builder's shared account, so this is admin-only.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const repo = String(body?.repo || 'ADPOV-MEDIA-ENT/the-truth-teller');
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
      return Response.json({ error: 'Invalid repo name' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');
    const res = await fetch(
      `https://api.github.com/repos/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=30`,
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
    const prs = await res.json();

    return Response.json({
      repo,
      pulls: prs.map((p) => ({
        number: p.number,
        title: p.title,
        state: p.state,
        merged: !!p.merged_at,
        draft: !!p.draft,
        author: p.user?.login || 'unknown',
        branch: p.head?.ref || '',
        created: p.created_at,
        updated: p.updated_at,
        comments: p.comments || 0,
        url: p.html_url,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}