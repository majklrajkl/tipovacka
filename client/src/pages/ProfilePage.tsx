import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    setNotifLoading(true);
    try {
      await api.updateNotifications(!user?.emailNotifications);
      await refreshUser();
    } catch (err: any) {
      console.error('Failed to update notifications');
    } finally {
      setNotifLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-muted text-sm mt-1">Manage your account settings</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Account Info</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-surface-500/30">
            <span className="text-sm text-muted">Username</span>
            <span className="text-sm font-medium text-white">{user?.username}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-surface-500/30">
            <span className="text-sm text-muted">Email</span>
            <span className="text-sm font-medium text-white">{user?.email || '—'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-surface-500/30">
            <span className="text-sm text-muted">Role</span>
            <span className={`text-sm font-medium ${user?.isAdmin ? 'text-accent' : 'text-white'}`}>
              {user?.isAdmin ? 'Admin' : 'Player'}
            </span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Notifications</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Match Reminders</p>
            <p className="text-xs text-muted mt-0.5">
              Get an email 1 hour before matches you haven't tipped yet
            </p>
          </div>
          <button
            type="button"
            disabled={notifLoading}
            onClick={handleToggleNotifications}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              user?.emailNotifications ? 'bg-accent' : 'bg-surface-500'
            } ${notifLoading ? 'opacity-50' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                user?.emailNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {error && (
            <div className="bg-red-500/15 text-red-400 px-4 py-3 rounded-lg text-sm border border-red-500/20">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-accent/15 text-accent px-4 py-3 rounded-lg text-sm border border-accent/20">
              {success}
            </div>
          )}
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
