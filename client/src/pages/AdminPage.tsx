import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'matches' | 'tournaments' | 'scoring' | 'users'>('matches');

  if (!user?.isAdmin) {
    return (
      <div className="card p-12 text-center">
        <p className="text-gray-400 text-lg">Access denied</p>
        <p className="text-gray-400 text-sm mt-1">Admin privileges required</p>
      </div>
    );
  }

  const tabs = [
    { id: 'matches' as const, label: 'Matches' },
    { id: 'tournaments' as const, label: 'Tournaments' },
    { id: 'scoring' as const, label: 'Scoring' },
    { id: 'users' as const, label: 'Users' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500 text-sm mt-1">Manage matches, tournaments, scoring rules, and users</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'matches' && <MatchesTab />}
      {activeTab === 'tournaments' && <TournamentsTab />}
      {activeTab === 'scoring' && <ScoringTab />}
      {activeTab === 'users' && <UsersTab />}
    </div>
  );
}

function MatchesTab() {
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [kickoff, setKickoff] = useState('');
  const [tournamentId, setTournamentId] = useState<string>('');
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [resultInputs, setResultInputs] = useState<Record<number, { home: string; away: string }>>({});

  const fetchMatches = async () => {
    const data = await api.getMatches();
    setMatches(data.matches);
    const inputs: Record<number, { home: string; away: string }> = {};
    data.matches.forEach((m: any) => {
      if (m.home_score != null) {
        inputs[m.id] = { home: String(m.home_score), away: String(m.away_score) };
      }
    });
    setResultInputs(inputs);
    setMatchesLoading(false);
  };

  useEffect(() => {
    fetchMatches();
    api.getTournaments().then((data) => setTournaments(data.tournaments));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.createMatch(homeTeam, awayTeam, kickoff, tournamentId ? Number(tournamentId) : null);
      setSuccess(`Match "${homeTeam} vs ${awayTeam}" created`);
      setHomeTeam('');
      setAwayTeam('');
      setKickoff('');
      setTournamentId('');
      fetchMatches();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetResult = async (matchId: number) => {
    const input = resultInputs[matchId];
    if (!input || input.home === '' || input.away === '') return;
    try {
      await api.updateMatchResult(matchId, Number(input.home), Number(input.away), 'finished');
      setSuccess('Match result updated');
      fetchMatches();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteMatch = async (matchId: number) => {
    if (!confirm('Delete this match and all associated tips?')) return;
    try {
      await api.deleteMatch(matchId);
      fetchMatches();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create match */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Match</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{error}</div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg text-sm border border-emerald-200">{success}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Home Team</label>
              <input
                type="text"
                className="input"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                placeholder="e.g. Barcelona"
                required
              />
            </div>
            <div>
              <label className="label">Away Team</label>
              <input
                type="text"
                className="input"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                placeholder="e.g. Real Madrid"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Kickoff Date & Time</label>
              <input
                type="datetime-local"
                className="input"
                value={kickoff}
                onChange={(e) => setKickoff(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Tournament (optional)</label>
              <select
                className="input"
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
              >
                <option value="">No tournament</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Match'}
          </button>
        </form>
      </div>

      {/* Existing matches - set results */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Manage Matches</h2>
        </div>
        {matchesLoading ? (
          <div className="p-6 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
          </div>
        ) : matches.length === 0 ? (
          <div className="p-6 text-center text-gray-400">No matches yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {matches.map((match) => (
              <div key={match.id} className="px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {match.home_team} vs {match.away_team}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(match.kickoff).toLocaleString()} &mdash;{' '}
                      <span
                        className={`font-medium ${
                          match.status === 'finished' ? 'text-gray-500' : 'text-blue-500'
                        }`}
                      >
                        {match.status}
                      </span>
                      {match.status === 'finished' && match.home_score != null && (
                        <span className="ml-1 font-semibold text-gray-700">
                          ({match.home_score} - {match.away_score})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      className="input w-16 text-center text-sm"
                      placeholder="H"
                      value={resultInputs[match.id]?.home ?? ''}
                      onChange={(e) =>
                        setResultInputs((prev) => ({
                          ...prev,
                          [match.id]: { ...prev[match.id], home: e.target.value, away: prev[match.id]?.away ?? '' },
                        }))
                      }
                    />
                    <span className="text-gray-400">:</span>
                    <input
                      type="number"
                      min="0"
                      className="input w-16 text-center text-sm"
                      placeholder="A"
                      value={resultInputs[match.id]?.away ?? ''}
                      onChange={(e) =>
                        setResultInputs((prev) => ({
                          ...prev,
                          [match.id]: { home: prev[match.id]?.home ?? '', away: e.target.value },
                        }))
                      }
                    />
                    <button
                      onClick={() => handleSetResult(match.id)}
                      className="btn-success btn-sm"
                    >
                      Set
                    </button>
                    <button
                      onClick={() => handleDeleteMatch(match.id)}
                      className="btn-danger btn-sm"
                    >
                      Del
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TournamentsTab() {
  const [name, setName] = useState('');
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ winnerTeam: '', bestScorer: '' });

  const fetchTournaments = async () => {
    const data = await api.getTournaments();
    setTournaments(data.tournaments);
    setLoading(false);
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError('');
    try {
      await api.createTournament(name.trim());
      setSuccess(`Tournament "${name.trim()}" created`);
      setName('');
      setTimeout(() => setSuccess(''), 2000);
      fetchTournaments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSetResults = async (id: number) => {
    try {
      await api.updateTournament(id, {
        status: 'finished',
        winnerTeam: editForm.winnerTeam,
        bestScorer: editForm.bestScorer,
      });
      setSuccess('Tournament results set');
      setEditingId(null);
      setTimeout(() => setSuccess(''), 2000);
      fetchTournaments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this tournament? Matches will be unlinked (not deleted).')) return;
    try {
      await api.deleteTournament(id);
      fetchTournaments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Tournament</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{error}</div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg text-sm border border-emerald-200">{success}</div>
          )}
          <div>
            <label className="label">Tournament Name</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Euro 2024"
              required
            />
          </div>
          <button type="submit" disabled={creating} className="btn-primary">
            {creating ? 'Creating...' : 'Create Tournament'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Manage Tournaments</h2>
        </div>
        {tournaments.length === 0 ? (
          <div className="p-6 text-center text-gray-400">No tournaments yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tournaments.map((t) => (
              <div key={t.id} className="px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400">
                      {t.match_count} match{t.match_count !== 1 ? 'es' : ''} &mdash;{' '}
                      <span className={`font-medium ${t.status === 'active' ? 'text-emerald-500' : 'text-gray-500'}`}>
                        {t.status}
                      </span>
                      {t.winner_team && (
                        <span className="ml-1 text-gray-600">
                          (Winner: {t.winner_team}{t.best_scorer ? `, Scorer: ${t.best_scorer}` : ''})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.status === 'active' && (
                      <button
                        onClick={() => {
                          setEditingId(editingId === t.id ? null : t.id);
                          setEditForm({ winnerTeam: t.winner_team || '', bestScorer: t.best_scorer || '' });
                        }}
                        className="btn-primary btn-sm"
                      >
                        Set Results
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="btn-danger btn-sm"
                    >
                      Del
                    </button>
                  </div>
                </div>
                {editingId === t.id && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="label">Winning Team</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. Spain"
                          value={editForm.winnerTeam}
                          onChange={(e) => setEditForm({ ...editForm, winnerTeam: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label">Best Scorer</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. Harry Kane"
                          value={editForm.bestScorer}
                          onChange={(e) => setEditForm({ ...editForm, bestScorer: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSetResults(t.id)}
                        disabled={!editForm.winnerTeam.trim() || !editForm.bestScorer.trim()}
                        className="btn-success btn-sm"
                      >
                        Finish & Set Results
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn-secondary btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoringTab() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.getScoringRules().then((data) => {
      setRules(data.rules);
      setLoading(false);
    });
  }, []);

  const handleUpdate = async (id: number, points: number) => {
    setSaving(id);
    try {
      await api.updateScoringRule(id, points);
      setSuccess('Rule updated');
      setTimeout(() => setSuccess(''), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Scoring Rules</h2>
      <p className="text-sm text-gray-500">
        Adjust the number of points awarded for each prediction accuracy level.
        Changes apply to all past and future calculations.
      </p>
      {success && (
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg text-sm border border-emerald-200">
          {success}
        </div>
      )}
      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50 rounded-lg px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{rule.label}</p>
              <p className="text-xs text-gray-500">Key: {rule.key}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                className="input w-20 text-center"
                value={rule.points}
                onChange={(e) =>
                  setRules((prev) =>
                    prev.map((r) =>
                      r.id === rule.id ? { ...r, points: Number(e.target.value) } : r
                    )
                  )
                }
              />
              <span className="text-sm text-gray-500">pts</span>
              <button
                onClick={() => handleUpdate(rule.id, rule.points)}
                disabled={saving === rule.id}
                className="btn-primary btn-sm"
              >
                {saving === rule.id ? '...' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    const data = await api.getUsers();
    setUsers(data.users);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleAdmin = async (id: number) => {
    await api.toggleAdmin(id);
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {users.map((u) => (
          <div key={u.id} className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {u.username}
                {u.id === currentUser?.id && (
                  <span className="text-xs text-primary-500 ml-1">(you)</span>
                )}
              </p>
              <p className="text-xs text-gray-400">
                Joined {new Date(u.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  u.is_admin
                    ? 'bg-primary-50 text-primary-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {u.is_admin ? 'Admin' : 'Player'}
              </span>
              {u.id !== currentUser?.id && (
                <button
                  onClick={() => handleToggleAdmin(u.id)}
                  className="btn-secondary btn-sm text-xs"
                >
                  {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
