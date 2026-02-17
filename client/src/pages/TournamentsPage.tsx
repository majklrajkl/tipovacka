import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Tournament {
  id: number;
  name: string;
  status: string;
  winner_team: string | null;
  best_scorer: string | null;
  match_count: number;
  created_at: string;
}

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  tips_visible: number;
  tips: Record<number, { homeScore: number; awayScore: number }>;
}

interface UserInfo {
  id: number;
  username: string;
}

export default function TournamentsPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (selectedId) {
    return <TournamentDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return <TournamentList onSelect={setSelectedId} />;
}

function TournamentList({ onSelect }: { onSelect: (id: number) => void }) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTournaments().then((data) => {
      setTournaments(data.tournaments);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tournaments</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pick a tournament to see matches and place your predictions
        </p>
      </div>

      {tournaments.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 text-lg">No tournaments yet</p>
          <p className="text-gray-400 text-sm mt-1">Ask your admin to create a tournament</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tournaments.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="card p-5 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">{t.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {t.match_count} match{t.match_count !== 1 ? 'es' : ''}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                    t.status === 'active'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t.status === 'active' ? 'Active' : 'Finished'}
                </span>
              </div>
              {t.status === 'finished' && t.winner_team && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-gray-500">
                    Winner: <span className="font-semibold text-gray-700">{t.winner_team}</span>
                  </p>
                  {t.best_scorer && (
                    <p className="text-xs text-gray-500">
                      Best Scorer: <span className="font-semibold text-gray-700">{t.best_scorer}</span>
                    </p>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [tournamentTips, setTournamentTips] = useState<Record<number, { winningTeam: string; bestScorer: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'finished'>('all');

  // Tournament tip form
  const [winningTeam, setWinningTeam] = useState('');
  const [bestScorer, setBestScorer] = useState('');
  const [savingTournamentTip, setSavingTournamentTip] = useState(false);
  const [tournamentTipSuccess, setTournamentTipSuccess] = useState(false);

  // Match tip inputs
  const [tipInputs, setTipInputs] = useState<Record<number, { home: string; away: string }>>({});
  const [savingTip, setSavingTip] = useState<number | null>(null);
  const [tipSuccess, setTipSuccess] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const data = await api.getTournament(id);
      setTournament(data.tournament);
      setMatches(data.matches);
      setUsers(data.users);
      setTournamentTips(data.tournamentTips);

      // Initialize inputs
      const myTournamentTip = data.tournamentTips[user!.id];
      if (myTournamentTip) {
        setWinningTeam(myTournamentTip.winningTeam);
        setBestScorer(myTournamentTip.bestScorer);
      }

      const inputs: Record<number, { home: string; away: string }> = {};
      data.matches.forEach((m: Match) => {
        const myTip = m.tips[user!.id];
        if (myTip) {
          inputs[m.id] = { home: String(myTip.homeScore), away: String(myTip.awayScore) };
        }
      });
      setTipInputs(inputs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleTipChange = (matchId: number, field: 'home' | 'away', value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setTipInputs((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value },
    }));
  };

  const submitMatchTip = async (matchId: number) => {
    const tip = tipInputs[matchId];
    if (!tip || tip.home === '' || tip.away === '') return;
    setSavingTip(matchId);
    setTipSuccess(null);
    try {
      await api.submitTip(matchId, Number(tip.home), Number(tip.away));
      setTipSuccess(matchId);
      setTimeout(() => setTipSuccess(null), 2000);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingTip(null);
    }
  };

  const submitTournamentTip = async () => {
    if (!winningTeam.trim() || !bestScorer.trim()) return;
    setSavingTournamentTip(true);
    try {
      await api.submitTournamentTip(id, winningTeam.trim(), bestScorer.trim());
      setTournamentTipSuccess(true);
      setTimeout(() => setTournamentTipSuccess(false), 2000);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingTournamentTip(false);
    }
  };

  const isUpcoming = (match: Match) =>
    match.status === 'upcoming' && new Date(match.kickoff) > new Date();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const getOutcomeBadge = (homeScore: number, awayScore: number) => {
    if (homeScore > awayScore) return { label: 'H', cls: 'bg-blue-100 text-blue-700' };
    if (homeScore < awayScore) return { label: 'A', cls: 'bg-orange-100 text-orange-700' };
    return { label: 'D', cls: 'bg-gray-100 text-gray-700' };
  };

  const getTipResultClass = (match: Match, tip: { homeScore: number; awayScore: number }) => {
    if (match.status !== 'finished' || match.home_score == null || match.away_score == null) return '';
    if (tip.homeScore === match.home_score && tip.awayScore === match.away_score) {
      return 'ring-2 ring-emerald-400 bg-emerald-50';
    }
    const tipDiff = tip.homeScore - tip.awayScore;
    const matchDiff = match.home_score - match.away_score;
    if (tipDiff === matchDiff) {
      return 'ring-2 ring-blue-400 bg-blue-50';
    }
    const tipOutcome = tip.homeScore > tip.awayScore ? 'H' : tip.homeScore < tip.awayScore ? 'A' : 'D';
    const matchOutcome = match.home_score > match.away_score ? 'H' : match.home_score < match.away_score ? 'A' : 'D';
    if (tipOutcome === matchOutcome) {
      return 'ring-2 ring-yellow-400 bg-yellow-50';
    }
    return 'bg-red-50';
  };

  const filteredMatches = matches.filter((m) => {
    if (filter === 'upcoming') return m.status === 'upcoming';
    if (filter === 'finished') return m.status === 'finished';
    return true;
  });

  const otherUsers = users.filter((u) => u.id !== user!.id);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="card p-12 text-center">
        <p className="text-gray-400 text-lg">Tournament not found</p>
        <button onClick={onBack} className="btn-primary mt-4">Go back</button>
      </div>
    );
  }

  const myTournamentTip = tournamentTips[user!.id];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{tournament.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {matches.length} match{matches.length !== 1 ? 'es' : ''}
            <span
              className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                tournament.status === 'active'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tournament.status === 'active' ? 'Active' : 'Finished'}
            </span>
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Tournament predictions card */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
          Tournament Predictions
        </h2>

        {/* Results if tournament is finished */}
        {tournament.status === 'finished' && tournament.winner_team && (
          <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <p className="text-sm font-medium text-emerald-800">
              Winner: <span className="font-bold">{tournament.winner_team}</span>
            </p>
            {tournament.best_scorer && (
              <p className="text-sm font-medium text-emerald-800 mt-1">
                Best Scorer: <span className="font-bold">{tournament.best_scorer}</span>
              </p>
            )}
          </div>
        )}

        {/* My prediction form */}
        {tournament.status === 'active' ? (
          <div className="space-y-3">
            <div>
              <label className="label">Winning Team</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Spain"
                value={winningTeam}
                onChange={(e) => setWinningTeam(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Best Scorer</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Harry Kane"
                value={bestScorer}
                onChange={(e) => setBestScorer(e.target.value)}
              />
            </div>
            <button
              onClick={submitTournamentTip}
              disabled={savingTournamentTip || !winningTeam.trim() || !bestScorer.trim()}
              className={`btn-sm ${tournamentTipSuccess ? 'btn-success' : 'btn-primary'}`}
            >
              {savingTournamentTip
                ? 'Saving...'
                : tournamentTipSuccess
                ? 'Saved!'
                : myTournamentTip
                ? 'Update Prediction'
                : 'Save Prediction'}
            </button>
          </div>
        ) : myTournamentTip ? (
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              Your pick - Winner:{' '}
              <span className={`font-semibold ${
                tournament.winner_team && myTournamentTip.winningTeam.toLowerCase() === tournament.winner_team.toLowerCase()
                  ? 'text-emerald-600' : tournament.status === 'finished' ? 'text-red-500' : 'text-gray-900'
              }`}>
                {myTournamentTip.winningTeam}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Your pick - Best Scorer:{' '}
              <span className={`font-semibold ${
                tournament.best_scorer && myTournamentTip.bestScorer.toLowerCase() === tournament.best_scorer.toLowerCase()
                  ? 'text-emerald-600' : tournament.status === 'finished' ? 'text-red-500' : 'text-gray-900'
              }`}>
                {myTournamentTip.bestScorer}
              </span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No prediction submitted</p>
        )}

        {/* Other users' tournament tips - visible when finished */}
        {tournament.status === 'finished' && otherUsers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Other predictions
            </p>
            <div className="space-y-2">
              {otherUsers.map((u) => {
                const tip = tournamentTips[u.id];
                if (!tip) {
                  return (
                    <div key={u.id} className="text-xs text-gray-400">
                      <span className="font-medium">{u.username}</span> — <span className="italic">no prediction</span>
                    </div>
                  );
                }
                const winnerCorrect = tournament.winner_team && tip.winningTeam.toLowerCase() === tournament.winner_team.toLowerCase();
                const scorerCorrect = tournament.best_scorer && tip.bestScorer.toLowerCase() === tournament.best_scorer.toLowerCase();
                return (
                  <div key={u.id} className="text-xs bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="font-medium text-gray-700">{u.username}</span>
                    <span className="mx-1">—</span>
                    <span className={winnerCorrect ? 'text-emerald-600 font-semibold' : 'text-gray-600'}>
                      {tip.winningTeam}
                    </span>
                    <span className="mx-1 text-gray-400">/</span>
                    <span className={scorerCorrect ? 'text-emerald-600 font-semibold' : 'text-gray-600'}>
                      {tip.bestScorer}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Match filter */}
      {matches.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Matches</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'upcoming', 'finished'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  filter === f
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Matches list */}
      {filteredMatches.length === 0 && matches.length > 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 text-lg">No matches found</p>
          <p className="text-gray-400 text-sm mt-1">Try a different filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match) => {
            const upcoming = isUpcoming(match);
            const myTip = match.tips[user!.id];
            const tipInput = tipInputs[match.id] || { home: '', away: '' };

            return (
              <div key={match.id} className="card">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-medium">
                      {formatDate(match.kickoff)}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        match.status === 'upcoming'
                          ? 'bg-blue-50 text-blue-600'
                          : match.status === 'live'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {match.status === 'upcoming' ? 'Upcoming' : match.status === 'live' ? 'Live' : 'Finished'}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-4 mt-3">
                    <span className="text-base sm:text-lg font-semibold text-gray-900 text-right flex-1">
                      {match.home_team}
                    </span>
                    <div className="flex items-center gap-2 min-w-[80px] justify-center">
                      {match.status === 'finished' && match.home_score != null ? (
                        <span className="text-2xl font-bold text-gray-900">
                          {match.home_score} - {match.away_score}
                        </span>
                      ) : (
                        <span className="text-lg text-gray-400">vs</span>
                      )}
                    </div>
                    <span className="text-base sm:text-lg font-semibold text-gray-900 text-left flex-1">
                      {match.away_team}
                    </span>
                  </div>
                </div>

                <div className="px-4 sm:px-6 py-4">
                  {upcoming ? (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        Your prediction
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          className="input w-16 text-center text-lg font-semibold"
                          placeholder="0"
                          value={tipInput.home}
                          onChange={(e) => handleTipChange(match.id, 'home', e.target.value)}
                        />
                        <span className="text-gray-400 font-medium">:</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          className="input w-16 text-center text-lg font-semibold"
                          placeholder="0"
                          value={tipInput.away}
                          onChange={(e) => handleTipChange(match.id, 'away', e.target.value)}
                        />
                        <button
                          onClick={() => submitMatchTip(match.id)}
                          disabled={savingTip === match.id || tipInput.home === '' || tipInput.away === ''}
                          className={`btn-sm ml-2 ${
                            tipSuccess === match.id ? 'btn-success' : 'btn-primary'
                          }`}
                        >
                          {savingTip === match.id
                            ? 'Saving...'
                            : tipSuccess === match.id
                            ? 'Saved!'
                            : myTip
                            ? 'Update'
                            : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : myTip ? (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        Your prediction
                      </p>
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${getTipResultClass(match, myTip)}`}>
                        {myTip.homeScore} : {myTip.awayScore}
                        {(() => {
                          const b = getOutcomeBadge(myTip.homeScore, myTip.awayScore);
                          return (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${b.cls}`}>
                              {b.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <p className="text-xs text-gray-400 italic">No prediction submitted</p>
                    </div>
                  )}

                  {match.tips_visible && otherUsers.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        Other predictions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {otherUsers.map((u) => {
                          const tip = match.tips[u.id];
                          if (!tip) {
                            return (
                              <div
                                key={u.id}
                                className="text-xs bg-gray-50 text-gray-400 px-2.5 py-1.5 rounded-lg"
                              >
                                <span className="font-medium">{u.username}</span>{' '}
                                <span className="italic">no tip</span>
                              </div>
                            );
                          }
                          return (
                            <div
                              key={u.id}
                              className={`text-xs px-2.5 py-1.5 rounded-lg ${getTipResultClass(match, tip) || 'bg-gray-50'}`}
                            >
                              <span className="font-medium text-gray-700">{u.username}</span>{' '}
                              <span className="font-semibold text-gray-900">
                                {tip.homeScore}:{tip.awayScore}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {matches.some((m) => m.status === 'finished') && (
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Tip results legend</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-400 inline-block" /> Exact score
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-400 inline-block" /> Correct goal diff
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-yellow-400 inline-block" /> Correct outcome
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-200 inline-block" /> Wrong
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
