import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Reset Password</h1>
          <p className="text-muted text-sm mt-0.5">Enter your email to receive a reset link</p>
        </div>

        <div className="card p-5">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="bg-accent/15 text-accent px-4 py-3 rounded-lg text-sm border border-accent/20">
                If an account with that email exists, a reset link has been sent. Check your inbox.
              </div>
              <Link to="/login" className="text-accent hover:text-accent-light font-medium text-sm">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                  <div className="bg-red-500/15 text-red-400 px-3 py-2 rounded-lg text-xs border border-red-500/20">
                    {error}
                  </div>
                )}
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-center text-xs text-muted-dark mt-4">
                <Link to="/login" className="text-accent hover:text-accent-light font-medium">
                  Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
