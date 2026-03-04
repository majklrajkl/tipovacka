import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/tournaments', label: 'Tournaments' },
    { to: '/leaderboard', label: 'Leaderboard' },
    ...(user?.isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-surface-700">
      <header className="bg-surface-800/80 backdrop-blur-lg border-b border-surface-500/50 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14">
            <Link to="/tournaments" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center">
                <span className="text-surface-900 font-bold text-sm">T</span>
              </div>
              <span className="text-lg font-bold text-white hidden sm:block tracking-tight">
                Tipovacka
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive(item.to)
                      ? 'bg-accent/15 text-accent'
                      : 'text-muted hover:text-white hover:bg-surface-600'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-2">
              <Link
                to="/profile"
                className="text-sm text-muted hover:text-white font-medium transition-colors"
              >
                {user?.username}
              </Link>
              <button onClick={logout} className="btn-secondary btn-sm">
                Sign out
              </button>
            </div>

            <button
              className="md:hidden p-2 rounded-lg text-muted hover:bg-surface-600 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-surface-500/50 bg-surface-800/95 backdrop-blur-lg">
            <div className="px-4 py-2 space-y-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive(item.to)
                      ? 'bg-accent/15 text-accent'
                      : 'text-muted hover:bg-surface-600 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-muted hover:bg-surface-600 hover:text-white"
              >
                Profile ({user?.username})
              </Link>
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>

      <footer className="border-t border-surface-500/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-center text-xs text-muted-dark">
            Tipovacka <span className="text-surface-400">v{__APP_VERSION__}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
