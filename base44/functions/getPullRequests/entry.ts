import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { normalizeRepo, githubGet } from '../../shared/githubRepo.ts';

// Lists pull requests for the Oracle codebase via the GitHub connector.
// The connector is the builder's shared account, so this is admin-only.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const repo = normalizeRepo(body?.repo, 'ADPOV-MEDIA-ENT/the-truth-teller');
    if (!repo) {
      return Response.json({ error: 'Invalid repo name' }, { status: 400 });
    }

    const prs = await githubGet(
      base44,
      `/repos/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=30`,
      'getPullRequests',
    );
    if (!prs) {
      return Response.json({ error: 'GitHub is not answering right now.' }, { status: 502 });
    }

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
    // Log the real cause server-side; never echo internal details to callers.
    console.error("getPullRequests: unhandled error", error);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}