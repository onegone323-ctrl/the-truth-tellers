import React from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import CompanyMark from '@/components/CompanyMark';

// A 404 page in the house style: obsidian depth, gold ember type, and an
// Oracle-flavored message instead of the platform default.
export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  const { data: authData, isFetched } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        return { user, isAuthenticated: true };
      } catch (error) {
        return { user: null, isAuthenticated: false };
      }
    }
  });

  return (
    <div
      className="obsidian-page min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center"
      style={{ background: "var(--void-deep)" }}
    >
      <div className="relative z-[1] max-w-md w-full space-y-7">
        <CompanyMark height={46} />
        <div>
          <h1 className="text-gold-ember font-heading" style={{ fontSize: 96, lineHeight: 1, margin: 0, fontWeight: 300 }}>
            404
          </h1>
          <div className="gold-hairline my-5" />
          <h2 className="neo-eyebrow" style={{ margin: 0 }}>This Chamber Does Not Exist</h2>
        </div>
        <p className="neo-note" style={{ fontSize: 15, lineHeight: 1.7 }}>
          The path <span style={{ color: "var(--ivory)" }}>/&nbsp;{pageName}&nbsp;</span> is not written in the
          cards. The page you seek has been moved, never existed, or the spread simply does not cover it.
        </p>
        {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
          <div className="neo-panel text-left" style={{ padding: 16 }}>
            <p className="neo-label" style={{ fontSize: 12, margin: 0 }}>Admin Note</p>
            <p className="neo-note" style={{ marginTop: 8, fontSize: 13 }}>
              This route is not registered in the app yet — ask the builder to add it.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/" className="neo-button">Return to the Oracle</Link>
          <Link to="/contact" className="neo-pill px-5 py-2.5 inline-flex items-center">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}