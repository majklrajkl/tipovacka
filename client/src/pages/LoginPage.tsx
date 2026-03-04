import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-700 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-accent rounded-2xl mb-3">
            <span className="text-surface-900 text-xl font-bold">T</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tipovacka</h1>
          <p className="text-muted text-sm mt-0.5">Sign in to your account</p>
        </div>

        <div className="card p-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="bg-red-500/15 text-red-400 px-3 py-2 rounded-lg text-xs border border-red-500/20">
                {error}
              </div>
            )}
            <div>
              <label className="label">Username</label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="text-center mt-4 space-y-2">
            <p className="text-xs text-muted-dark">
              <Link to="/forgot-password" className="text-accent hover:text-accent-light font-medium">
                Forgot your password?
              </Link>
            </p>
            <p className="text-xs text-muted-dark">
              Don't have an account?{' '}
              <Link to="/register" className="text-accent hover:text-accent-light font-medium">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
