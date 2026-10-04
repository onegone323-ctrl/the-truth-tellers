import React from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';

// Every page below the home route loads on demand — smaller initial bundle.
const Journal = React.lazy(() => import('@/pages/Journal'));
const Memory = React.lazy(() => import('@/pages/Memory'));
const Timeline = React.lazy(() => import('@/pages/Timeline'));
const Cards = React.lazy(() => import('@/pages/Cards'));
const CardDetail = React.lazy(() => import('@/pages/CardDetail'));
const JournalDetail = React.lazy(() => import('@/pages/JournalDetail'));
const PullRequests = React.lazy(() => import('@/pages/PullRequests'));
const Connect = React.lazy(() => import('@/pages/Connect'));
const Settings = React.lazy(() => import('@/pages/Settings'));

// Gold spinner shown while a lazy page chunk loads.
const RouteSplash = () => (
  <div className="flex justify-center pt-16">
    <div className="w-8 h-8 border-2 rounded-full animate-spin"
      style={{ borderColor: "rgba(212,175,55,0.3)", borderTopColor: "#d4af37" }} />
  </div>
);
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import OAuthConsent from '@/pages/OAuthConsent';
import { Navigate } from 'react-router-dom';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth/consent" element={<OAuthConsent />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={
          <React.Suspense fallback={<RouteSplash />}>
            <Layout />
          </React.Suspense>
        }>
          <Route path="/" element={<Home />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/journal/:id" element={<JournalDetail />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/cards/:name" element={<CardDetail />} />
          <Route path="/pulls" element={<PullRequests />} />
          <Route path="/connect" element={<Connect />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App