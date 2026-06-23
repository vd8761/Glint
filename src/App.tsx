/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { CertificateViewer } from './components/CertificateViewer';
import { AuthPage } from './components/AuthPage';

type RouteState = 
  | { type: 'home' }
  | { type: 'auth' }
  | { type: 'dashboard'; workspaceId: string; tab: 'overview' | 'programs' | 'templates' | 'recipients' | 'issued' | 'branding' | 'settings' | 'emails' }
  | { type: 'credential'; id: string };

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
      
      if (hash.startsWith('#credential=')) {
        const id = hash.replace('#credential=', '').trim();
        setRoute({ type: 'credential', id });
      } else if (hash.startsWith('#/dashboard') || hash.startsWith('#dashboard')) {
        if (!token) {
          window.location.hash = '#auth';
          setRoute({ type: 'auth' });
        } else {
          const queryIndex = hash.indexOf('?');
          let wsId = user?.workspaceId || 'ws-google-infra';
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
          const wsId = user?.workspaceId || 'ws-google-infra';
          window.location.hash = `#/dashboard?workspaceId=${wsId}&tab=overview`;
        } else {
          setRoute({ type: 'auth' });
        }
      } else {
        setRoute({ type: 'home' });
      }
    };

    // Run initial parse on mount
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [token, user]);

  // Direct custom screen state updates
  const navigateToHome = () => {
    window.location.hash = '';
    setRoute({ type: 'home' });
  };

  const navigateToDashboard = (workspaceId: string = 'ws-google-infra', tab: string = 'overview') => {
    if (!token) {
      window.location.hash = '#auth';
      setRoute({ type: 'auth' });
    } else {
      window.location.hash = `#/dashboard?workspaceId=${workspaceId}&tab=${tab}`;
      setRoute({ type: 'dashboard', workspaceId, tab: tab as any });
    }
  };

  const navigateToCredential = (id: string) => {
    window.location.hash = `#credential=${id}`;
    setRoute({ type: 'credential', id });
  };

  const navigateToAuth = () => {
    window.location.hash = '#auth';
    setRoute({ type: 'auth' });
  };

  const handleLoginSuccess = (newToken: string, newUser: any) => {
    localStorage.setItem('glint_token', newToken);
    localStorage.setItem('glint_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    const wsId = newUser.workspaceId || 'ws-google-infra';
    window.location.hash = `#/dashboard?workspaceId=${wsId}&tab=overview`;
  };

  const handleLogout = () => {
    localStorage.removeItem('glint_token');
    localStorage.removeItem('glint_user');
    setToken(null);
    setUser(null);
    window.location.hash = '';
    setRoute({ type: 'home' });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] transition-colors duration-200">
      {route.type === 'home' && (
        <LandingPage 
          onStartFree={token ? () => navigateToDashboard(user?.workspaceId || 'ws-google-infra', 'overview') : navigateToAuth}
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

      {route.type === 'credential' && (
        <CertificateViewer 
          certificateId={route.id}
          onBackToHome={navigateToHome}
        />
      )}
    </div>
  );
}
