import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import TeamAutocomplete from '../components/TeamAutocomplete';

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'matches' | 'tournaments' | 'scoring' | 'users' | 'members'>('matches');

  if (!user?.isAdmin) {
    return (
      <div className="card p-12 text-center">
        <p className="text-gray-400">Access denied</p>
        <p className="text-gray-400 text-sm mt-1">Admin privileges required</p>
      </div>
    );
  }

  const tabs = [
    { id: 'matches' as const, label: 'Matches' },
    { id: 'tournaments' as const, label: 'Tournaments' },
    { id: 'scoring' as const, label: 'Scoring' },
    { id: 'users' as const, label: 'Users' },
    { id: 'members' as const, label: 'Members' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Panel</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage the tipping game</p>
      </div>

      <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 w-fit overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
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
      {activeTab === 'members' && <MembersTab />}
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
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importTournamentId, setImportTournamentId] = useState<string>('');
  const [importing, setImporting] = useState(false);

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
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Create Match</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          {error && (
            <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs border border-red-200">{error}</div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-xs border border-emerald-200">{success}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Home Team</label>
              <input type="text" className="input" value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} placeholder="Home" required />
            </div>
            <div>
              <label className="label">Away Team</label>
              <input type="text" className="input" value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} placeholder="Away" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Kickoff</label>
              <input type="datetime-local" className="input" value={kickoff} onChange={(e) => setKickoff(e.target.value)} required />
            </div>
            <div>
              <label className="label">Tournament</label>
              <select className="input" value={tournamentId} onChange={(e) => setTournamentId(e.target.value)}>
                <option value="">None</option>
                {tournaments.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary btn-sm">
            {loading ? 'Creating...' : 'Create Match'}
          </button>
        </form>
      </div>

      <div className="card">
        <button onClick={() => setShowImport(!showImport)} className="w-full px-4 py-3 flex items-center justify-between text-left">
          <h2 className="text-sm font-semibold text-gray-900">Import from CSV</h2>
          <span className="text-xs text-gray-400">{showImport ? 'Hide' : 'Show'}</span>
        </button>
        {showImport && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-xs text-gray-500">
              Format: <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">HomeTeam,AwayTeam,YYYY-MM-DDTHH:MM</code>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tournament</label>
                <select className="input" value={importTournamentId} onChange={(e) => setImportTournamentId(e.target.value)}>
                  <option value="">None</option>
                  {tournaments.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
            </div>
            <textarea
              className="input min-h-[80px] font-mono text-xs"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Germany,Scotland,2026-06-11T21:00"
              rows={4}
            />
            <button
              onClick={async () => {
                setError('');
                setSuccess('');
                const lines = csvText.trim().split('\n').filter((l) => l.trim());
                if (lines.length === 0) { setError('No data to import'); return; }
                const parsed = lines.map((line) => {
                  const parts = line.split(',').map((s) => s.trim());
                  return { homeTeam: parts[0], awayTeam: parts[1], kickoff: parts[2] };
                });
                const invalid = parsed.filter((m) => !m.homeTeam || !m.awayTeam || !m.kickoff);
                if (invalid.length > 0) { setError(`${invalid.length} row(s) have missing fields`); return; }
                setImporting(true);
                try {
                  const result = await api.importMatches(parsed, importTournamentId ? Number(importTournamentId) : null);
                  setSuccess(`Imported ${result.imported} match${result.imported !== 1 ? 'es' : ''}`);
                  setCsvText('');
                  fetchMatches();
                } catch (err: any) { setError(err.message); }
                finally { setImporting(false); }
              }}
              disabled={importing || !csvText.trim()}
              className="btn-primary btn-sm"
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Manage Matches</h2>
        </div>
        {matchesLoading ? (
          <div className="p-4 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
          </div>
        ) : matches.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">No matches yet</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {matches.map((match) => (
              <div key={match.id} className="px-3 sm:px-4 py-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-xs">
                      {match.home_team} vs {match.away_team}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {(() => { const d = new Date(match.kickoff); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })()}
                      {' '}&mdash;{' '}
                      <span className={match.status === 'finished' ? 'text-gray-500' : 'text-blue-500'}>{match.status}</span>
                      {match.status === 'finished' && match.home_score != null && (
                        <span className="ml-1 font-semibold text-gray-600">({match.home_score}-{match.away_score})</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" min="0" className="input !w-12 text-center text-xs !py-1"
                      placeholder="H" value={resultInputs[match.id]?.home ?? ''}
                      onChange={(e) => setResultInputs((prev) => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value, away: prev[match.id]?.away ?? '' } }))}
                    />
                    <span className="text-gray-300 text-xs">:</span>
                    <input
                      type="number" min="0" className="input !w-12 text-center text-xs !py-1"
                      placeholder="A" value={resultInputs[match.id]?.away ?? ''}
                      onChange={(e) => setResultInputs((prev) => ({ ...prev, [match.id]: { home: prev[match.id]?.home ?? '', away: e.target.value } }))}
                    />
                    <button onClick={() => handleSetResult(match.id)} className="btn-success btn-sm !text-[11px] !px-2 !py-1">Set</button>
                    <button onClick={() => handleDeleteMatch(match.id)} className="btn-danger btn-sm !text-[11px] !px-2 !py-1">Del</button>
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
  const [description, setDescription] = useState('');
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ winnerTeam: '', bestScorer: '' });
  const [editTeams, setEditTeams] = useState<string[]>([]);
  const [descEditId, setDescEditId] = useState<number | null>(null);
  const [descEdit, setDescEdit] = useState('');

  const fetchTournaments = async () => {
    const data = await api.getTournaments();
    setTournaments(data.tournaments);
    setLoading(false);
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const openEditForm = async (t: any) => {
    if (editingId === t.id) {
      setEditingId(null);
      return;
    }
    setEditingId(t.id);
    setEditForm({ winnerTeam: t.winner_team || '', bestScorer: t.best_scorer || '' });
    try {
      const data = await api.getTournamentTeams(t.id);
      setEditTeams(data.teams);
    } catch {
      setEditTeams([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError('');
    try {
      await api.createTournament(name.trim(), description.trim() || undefined);
      setSuccess(`Tournament "${name.trim()}" created`);
      setName('');
      setDescription('');
      setTimeout(() => setSuccess(''), 2000);
      fetchTournaments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSetResults = async (id: number, finish: boolean) => {
    try {
      await api.updateTournament(id, {
        ...(finish ? { status: 'finished' } : {}),
        winnerTeam: editForm.winnerTeam,
        bestScorer: editForm.bestScorer,
      });
      setSuccess(finish ? 'Tournament finished & results set' : 'Tournament results updated');
      setEditingId(null);
      setTimeout(() => setSuccess(''), 2000);
      fetchTournaments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveDescription = async (id: number) => {
    try {
      await api.updateTournament(id, { description: descEdit });
      setSuccess('Description updated');
      setDescEditId(null);
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
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Create Tournament</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          {error && (
            <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs border border-red-200">{error}</div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-xs border border-emerald-200">{success}</div>
          )}
          <div>
            <label className="label">Tournament Name</label>
            <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. MS Hokej 2026" required />
          </div>
          <div>
            <label className="label">Description (for leaderboard)</label>
            <input type="text" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description shown on the leaderboard" />
          </div>
          <button type="submit" disabled={creating} className="btn-primary btn-sm">
            {creating ? 'Creating...' : 'Create Tournament'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Manage Tournaments</h2>
        </div>
        {tournaments.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">No tournaments yet</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tournaments.map((t) => (
              <div key={t.id} className="px-3 sm:px-4 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{t.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {t.match_count} match{t.match_count !== 1 ? 'es' : ''}
                      <span className="mx-1 text-gray-300">|</span>
                      {t.member_count} member{t.member_count !== 1 ? 's' : ''}
                      <span className="mx-1 text-gray-300">|</span>
                      <span className={t.status === 'active' ? 'text-emerald-500 font-medium' : 'text-gray-500'}>{t.status}</span>
                      {t.winner_team && (
                        <span className="ml-1 text-gray-500">
                          (Winner: {t.winner_team}{t.best_scorer ? `, Scorer: ${t.best_scorer}` : ''})
                        </span>
                      )}
                    </p>
                    {t.description && (
                      <p className="text-[11px] text-gray-500 mt-0.5 italic">"{t.description}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => {
                        if (descEditId === t.id) {
                          setDescEditId(null);
                        } else {
                          setDescEditId(t.id);
                          setDescEdit(t.description || '');
                        }
                      }}
                      className="btn-secondary btn-sm !text-[11px]"
                    >
                      Desc
                    </button>
                    {t.status === 'active' ? (
                      <button
                        onClick={() => openEditForm(t)}
                        className="btn-primary btn-sm !text-[11px]"
                      >
                        Finish
                      </button>
                    ) : (
                      <button
                        onClick={() => openEditForm(t)}
                        className="btn-secondary btn-sm !text-[11px]"
                      >
                        Edit Results
                      </button>
                    )}
                    <button onClick={() => handleDelete(t.id)} className="btn-danger btn-sm !text-[11px]">Del</button>
                  </div>
                </div>

                {descEditId === t.id && (
                  <div className="mt-2 p-2.5 bg-gray-50 rounded-lg flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="label">Description</label>
                      <input type="text" className="input" value={descEdit} onChange={(e) => setDescEdit(e.target.value)} placeholder="Leaderboard description" />
                    </div>
                    <button onClick={() => handleSaveDescription(t.id)} className="btn-primary btn-sm !text-[11px]">Save</button>
                  </div>
                )}

                {editingId === t.id && (
                  <div className="mt-2 p-2.5 bg-gray-50 rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label">Winning Team</label>
                        <TeamAutocomplete
                          value={editForm.winnerTeam}
                          onChange={(val) => setEditForm({ ...editForm, winnerTeam: val })}
                          teams={editTeams}
                          placeholder="e.g. Finland"
                        />
                      </div>
                      <div>
                        <label className="label">Best Scorer</label>
                        <input type="text" className="input" placeholder="e.g. McDavid" value={editForm.bestScorer} onChange={(e) => setEditForm({ ...editForm, bestScorer: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {t.status === 'active' ? (
                        <button onClick={() => handleSetResults(t.id, true)} disabled={!editForm.winnerTeam.trim() || !editForm.bestScorer.trim()} className="btn-success btn-sm !text-[11px]">
                          Finish & Set Results
                        </button>
                      ) : (
                        <button onClick={() => handleSetResults(t.id, false)} disabled={!editForm.winnerTeam.trim() || !editForm.bestScorer.trim()} className="btn-success btn-sm !text-[11px]">
                          Update Results
                        </button>
                      )}
                      <button onClick={() => setEditingId(null)} className="btn-secondary btn-sm !text-[11px]">Cancel</button>
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
    <div className="card p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">Scoring Rules</h2>
      <p className="text-xs text-gray-500">Changes apply retroactively to all calculations.</p>
      {success && (
        <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-xs border border-emerald-200">{success}</div>
      )}
      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <div>
              <p className="text-xs font-medium text-gray-900">{rule.label}</p>
              <p className="text-[11px] text-gray-400">{rule.key}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number" min="0" className="input !w-16 text-center text-xs !py-1"
                value={rule.points}
                onChange={(e) => setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, points: Number(e.target.value) } : r))}
              />
              <span className="text-[11px] text-gray-400">pts</span>
              <button onClick={() => handleUpdate(rule.id, rule.points)} disabled={saving === rule.id} className="btn-primary btn-sm !text-[11px] !px-2 !py-1">
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
  const [resetPasswordId, setResetPasswordId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

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

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Delete this user? All their tips, tournament memberships, and data will be permanently removed.')) return;
    setError('');
    try {
      await api.deleteUser(id);
      setSuccess('User deleted');
      setTimeout(() => setSuccess(''), 3000);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (id: number) => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setResetting(true);
    setError('');
    try {
      await api.resetUserPassword(id, newPassword);
      setSuccess('Password reset successfully');
      setResetPasswordId(null);
      setNewPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResetting(false);
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
    <div className="card">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">User Management</h2>
      </div>
      {success && (
        <div className="mx-4 mt-3 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-xs border border-emerald-200">{success}</div>
      )}
      {error && (
        <div className="mx-4 mt-3 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs border border-red-200">{error}</div>
      )}
      <div className="divide-y divide-gray-50">
        {users.map((u) => (
          <div key={u.id} className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {u.username}
                  {u.id === currentUser?.id && (
                    <span className="text-[10px] text-primary-500 ml-1">(you)</span>
                  )}
                </p>
                <p className="text-[11px] text-gray-400">
                  Joined {(() => { const d = new Date(u.created_at); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`; })()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${u.is_admin ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                  {u.is_admin ? 'Admin' : 'Player'}
                </span>
                {u.id !== currentUser?.id && (
                  <>
                    <button onClick={() => handleToggleAdmin(u.id)} className="btn-secondary btn-sm !text-[11px] !px-2 !py-1">
                      {u.is_admin ? 'Demote' : 'Promote'}
                    </button>
                    <button
                      onClick={() => {
                        setResetPasswordId(resetPasswordId === u.id ? null : u.id);
                        setNewPassword('');
                        setError('');
                      }}
                      className="btn-secondary btn-sm !text-[11px] !px-2 !py-1"
                    >
                      Reset PW
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="btn-danger btn-sm !text-[11px] !px-2 !py-1"
                    >
                      Del
                    </button>
                  </>
                )}
              </div>
            </div>
            {resetPasswordId === u.id && (
              <div className="mt-2 p-2.5 bg-gray-50 rounded-lg flex gap-2 items-end">
                <div className="flex-1">
                  <label className="label">New Password</label>
                  <input
                    type="text"
                    className="input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                </div>
                <button
                  onClick={() => handleResetPassword(u.id)}
                  disabled={resetting || newPassword.length < 6}
                  className="btn-primary btn-sm !text-[11px]"
                >
                  {resetting ? '...' : 'Set'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MembersTab() {
  const [members, setMembers] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchData = async () => {
    const [membersData, tournamentsData] = await Promise.all([
      api.getTournamentMembers(),
      api.getTournaments(),
    ]);
    setMembers(membersData.members);
    setTournaments(tournamentsData.tournaments);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTogglePaid = async (userId: number, tournamentId: number) => {
    const key = `${userId}-${tournamentId}`;
    setToggling(key);
    try {
      await api.toggleMemberPaid(userId, tournamentId);
      await fetchData();
    } catch {
      // ignore
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
      </div>
    );
  }

  // Group by tournament
  const grouped: Record<number, { name: string; members: any[] }> = {};
  tournaments.forEach((t) => {
    grouped[t.id] = { name: t.name, members: [] };
  });
  members.forEach((m) => {
    if (grouped[m.tournament_id]) {
      grouped[m.tournament_id].members.push(m);
    }
  });

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">View which users joined each tournament and mark payments.</p>
      {Object.entries(grouped).map(([tid, group]) => (
        <div key={tid} className="card">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{group.name}</h3>
            <span className="text-[10px] text-gray-400">{group.members.length} member{group.members.length !== 1 ? 's' : ''}</span>
          </div>
          {group.members.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400">No members yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {group.members.map((m) => {
                const key = `${m.user_id}-${m.tournament_id}`;
                return (
                  <div key={key} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.username}</p>
                      <p className="text-[11px] text-gray-400">
                        Joined {(() => { const d = new Date(m.joined_at); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`; })()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleTogglePaid(m.user_id, m.tournament_id)}
                      disabled={toggling === key}
                      className={`btn-sm !text-[11px] ${
                        m.paid
                          ? 'btn-success'
                          : 'btn-secondary !text-orange-600 !border-orange-200 hover:!bg-orange-50'
                      }`}
                    >
                      {toggling === key ? '...' : m.paid ? 'Paid' : 'Unpaid'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
      {Object.keys(grouped).length === 0 && (
        <div className="card p-6 text-center text-gray-400 text-sm">No tournaments yet</div>
      )}
    </div>
  );
}
