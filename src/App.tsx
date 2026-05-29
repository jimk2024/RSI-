/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { LandingPage } from "./LandingPage";
import { Dashboard } from "./Dashboard";
import { FeaturesPage } from "./FeaturesPage";
import { TechnologyPage } from "./TechnologyPage";
import { DocsPage } from "./DocsPage";
import { LeaderboardPage } from "./LeaderboardPage";
import { AuthProvider, useAuth } from "./AuthContext";
import { AuthModal } from "./AuthModal";
import { LicensePage } from "./LicensePage";
import { AdminPage } from "./AdminPage";

function AppContent() {
  const [currentPath, setCurrentPath] = useState(window.location.hash || '#/');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    const onHashChange = () => setCurrentPath(window.location.hash || '#/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleEnterDashboard = () => {
    if (user) {
      if (user.isExpired) {
        window.location.hash = '#/license';
      } else {
        window.location.hash = '#/dashboard';
      }
    } else {
      setShowAuthModal(true);
    }
  };

  // Routing guards
  useEffect(() => {
    if (currentPath === '#/dashboard') {
        if (!loading && !user) {
            window.location.hash = '#/';
            setShowAuthModal(true);
        } else if (user && user.isExpired) {
            window.location.hash = '#/license';
        }
    }
    
    if (currentPath === '#/license') {
        if (!loading && !user) {
            window.location.hash = '#/';
            setShowAuthModal(true);
        }
    }
  }, [currentPath, user, loading]);

  if (loading && (currentPath === '#/dashboard' || currentPath === '#/license')) {
    return <div className="min-h-screen bg-[#0b0e11] flex flex-col items-center justify-center text-gray-400 font-mono text-sm gap-4">
      <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-white animate-spin"></div>
      联机状态检查中...
    </div>;
  }

  let content;
  if (currentPath === '#/admin') {
    return <AdminPage />;
  } else if (currentPath === '#/license') {
    content = <LicensePage onBack={() => window.location.hash = '#/'} />;
  } else if (currentPath === '#/dashboard' && user && !user.isExpired) {
    content = <Dashboard />;
  } else if (currentPath === '#/features') {
    content = <FeaturesPage onEnter={handleEnterDashboard} />;
  } else if (currentPath === '#/technology') {
    content = <TechnologyPage onEnter={handleEnterDashboard} />;
  } else if (currentPath === '#/docs') {
    content = <DocsPage onEnter={handleEnterDashboard} />;
  } else if (currentPath === '#/leaderboard') {
    content = <LeaderboardPage onBack={() => window.location.hash = '#/'} />;
  } else {
    content = <LandingPage onEnter={handleEnterDashboard} />;
  }

  return (
    <>
      {content}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

