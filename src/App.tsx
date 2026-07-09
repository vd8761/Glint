/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { LandingPage } from './components/LandingPage';
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const CertificateViewer = lazy(() => import('./components/CertificateViewer').then(m => ({ default: m.CertificateViewer })));
const AuthPage = lazy(() => import('./components/AuthPage').then(m => ({ default: m.AuthPage })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
import { Toaster } from 'sonner';

type RouteState = 
  | { type: 'home' }
  | { type: 'auth' }
  | { type: 'dashboard'; workspaceId: string; tab: 'overview' | 'programs' | 'templates' | 'recipients' | 'issued' | 'branding' | 'settings' | 'emails' }
  | { type: 'admin'; tab: 'workspaces' | 'programs' | 'certificates' }
  | { type: 'credential'; id: string };

const isAdmin = (user: any): boolean => user?.role === 'admin';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('glint_token'));
  const [user, setUser] = useState<any | null>(() => {
    const stored = localStorage.getItem('glint_user');
    try {
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [route, setRoute] = useState<RouteState>({ type: 'home' });

  // Handle URL hash changes for robust link routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;

      // `/c/<id>` is a real server route: the server injects Open Graph tags for
      // the certificate before the SPA boots, so a link shared to LinkedIn or
      // WhatsApp shows the recipient and program rather than a generic card.
      const pathMatch = window.location.pathname.match(/^\/c\/([^/]+)\/?$/);
      if (pathMatch) {
        setRoute({ type: 'credential', id: decodeURIComponent(pathMatch[1]) });
        return;
      }

      // Degraded path: the server could not render metadata for /c/<id> and
      // redirected here rather than showing the recipient a blank page.
      const fallbackId = new URLSearchParams(window.location.search).get('c');
      if (fallbackId) {
        setRoute({ type: 'credential', id: fallbackId });
        return;
      }

      if (hash.startsWith('#credential=')) {
        // Links already in the wild use the old fragment form. Rewrite them to
        // the real path so the address bar and any re-share carry metadata.
        const id = hash.replace('#credential=', '').trim();
        window.location.replace(`/c/${encodeURIComponent(id)}`);
        return;
      }

      if (hash.startsWith('#/admin') || hash.startsWith('#admin')) {
        if (!token || !isAdmin(user)) {
          window.location.hash = '#auth';
          setRoute({ type: 'auth' });
        } else {
          const queryIndex = hash.indexOf('?');
          let activeTab: any = 'workspaces';
          if (queryIndex !== -1) {
            const params = new URLSearchParams(hash.substring(queryIndex));
            activeTab = params.get('tab') || 'workspaces';
          }
          setRoute({ type: 'admin', tab: activeTab });
        }
      } else if (hash.startsWith('#/dashboard') || hash.startsWith('#dashboard')) {
        if (!token) {
          window.location.hash = '#auth';
          setRoute({ type: 'auth' });
        } else if (isAdmin(user)) {
          window.location.hash = `#/admin?tab=workspaces`;
          setRoute({ type: 'admin', tab: 'workspaces' });
        } else {
          const queryIndex = hash.indexOf('?');
          let wsId = user?.workspaceId ?? '';
          let activeTab: any = 'overview';
          if (queryIndex !== -1) {
            const params = new URLSearchParams(hash.substring(queryIndex));
            wsId = params.get('workspaceId') || wsId;
            activeTab = params.get('tab') || 'overview';
          }
          setRoute({ type: 'dashboard', workspaceId: wsId, tab: activeTab });
        }
      } else if (hash === '#auth' || hash.startsWith('#auth')) {
        if (token) {
          if (isAdmin(user)) {
            window.location.hash = `#/admin?tab=workspaces`;
          } else {
            window.location.hash = `#/dashboard?workspaceId=${user?.workspaceId ?? ''}&tab=overview`;
          }
        } else {
          setRoute({ type: 'auth' });
        }
      } else {
        setRoute({ type: 'home' });
      }
    };

    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    // The certificate page lives at a real path, so back/forward across it are
    // popstate events, not hashchange.
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [token, user]);

  /** Leaves `/c/<id>` back to the SPA root, which hash changes alone cannot do. */
  const leaveCertificatePath = () => {
    if (window.location.pathname !== '/') window.history.pushState({}, '', '/');
  };

  const navigateToHome = () => {
    leaveCertificatePath();
    window.location.hash = '';
    setRoute({ type: 'home' });
  };

  const navigateToDashboard = (workspaceId?: string, tab: string = 'overview') => {
    leaveCertificatePath();
    if (!token) {
      window.location.hash = '#auth';
      setRoute({ type: 'auth' });
    } else if (isAdmin(user)) {
      window.location.hash = `#/admin?tab=workspaces`;
      setRoute({ type: 'admin', tab: 'workspaces' });
    } else {
      const wsId = workspaceId ?? user?.workspaceId ?? '';
      window.location.hash = `#/dashboard?workspaceId=${wsId}&tab=${tab}`;
      setRoute({ type: 'dashboard', workspaceId: wsId, tab: tab as any });
    }
  };

  const navigateToAdmin = (tab: string = 'workspaces') => {
    leaveCertificatePath();
    if (!token || !isAdmin(user)) {
      window.location.hash = '#auth';
      setRoute({ type: 'auth' });
    } else {
      window.location.hash = `#/admin?tab=${tab}`;
      setRoute({ type: 'admin', tab: tab as any });
    }
  };

  const navigateToCredential = (id: string) => {
    window.history.pushState({}, '', `/c/${encodeURIComponent(id)}`);
    setRoute({ type: 'credential', id });
  };

  const navigateToAuth = () => {
    leaveCertificatePath();
    window.location.hash = '#auth';
    setRoute({ type: 'auth' });
  };

  const handleLoginSuccess = (newToken: string, newUser: any) => {
    localStorage.setItem('glint_token', newToken);
    localStorage.setItem('glint_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    leaveCertificatePath();
    if (isAdmin(newUser)) {
      window.location.hash = `#/admin?tab=workspaces`;
    } else {
      window.location.hash = `#/dashboard?workspaceId=${newUser.workspaceId ?? ''}&tab=overview`;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('glint_token');
    localStorage.removeItem('glint_user');
    setToken(null);
    setUser(null);
    leaveCertificatePath();
    window.location.hash = '';
    setRoute({ type: 'home' });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] transition-colors duration-200">
      <Toaster position="bottom-right" richColors />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      }>
        {route.type === 'home' && (
          <LandingPage
            onStartFree={token ? () => navigateToDashboard(user?.workspaceId, 'overview') : navigateToAuth}
            onViewSample={(id) => navigateToCredential(id)}
            onSelectWorkspace={token ? (id) => navigateToDashboard(id, 'overview') : navigateToAuth}
          />
        )}

        {route.type === 'auth' && (
          <AuthPage 
            onLoginSuccess={handleLoginSuccess}
            onBackToHome={navigateToHome}
          />
        )}

        {route.type === 'dashboard' && (
          <Dashboard 
            currentWorkspaceId={route.workspaceId}
            activeTab={route.tab}
            token={token}
            user={user}
            onLogout={handleLogout}
            onTabChange={(tab) => navigateToDashboard(route.workspaceId, tab)}
            onWorkspaceChange={(id) => navigateToDashboard(id, route.tab)}
            onViewCertificatePage={(id) => navigateToCredential(id)}
          />
        )}

        {route.type === 'admin' && (
          <AdminDashboard 
            token={token}
            user={user}
            onLogout={handleLogout}
          />
        )}

        {route.type === 'credential' && (
          <CertificateViewer 
            certificateId={route.id}
            onBackToHome={navigateToHome}
          />
        )}
      </Suspense>
    </div>
  );
}
