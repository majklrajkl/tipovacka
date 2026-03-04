import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-700 px-4">
        <div className="card p-6 max-w-sm w-full text-center">
          <p className="text-red-400 font-medium mb-3">Invalid reset link</p>
          <Link to="/forgot-password" className="text-accent hover:text-accent-light font-medium text-sm">
            Request a new one
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-700 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-accent rounded-2xl mb-3">
            <span className="text-surface-900 text-xl font-bold">T</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">New Password</h1>
          <p className="text-muted text-sm mt-0.5">Choose a new password for your account</p>
        </div>

        <div className="card p-5">
          {success ? (
            <div className="text-center space-y-3">
              <div className="bg-accent/15 text-accent px-4 py-3 rounded-lg text-sm border border-accent/20">
                Password has been reset successfully!
              </div>
              <Link to="/login" className="text-accent hover:text-accent-light font-medium text-sm">
                Sign in with your new password
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="bg-red-500/15 text-red-400 px-3 py-2 rounded-lg text-xs border border-red-500/20">
                  {error}
                </div>
              )}
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input
                  type="password"
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
