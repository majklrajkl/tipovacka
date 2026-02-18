import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import TeamAutocomplete from '../components/TeamAutocomplete';

interface Tournament {
  id: number;
  name: string;
  status: string;
  description: string | null;
  winner_team: string | null;
  best_scorer: string | null;
  match_count: number;
  member_count: number;
  joined: boolean;
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
  const [joining, setJoining] = useState<number | null>(null);

  const fetchTournaments = async () => {
    const data = await api.getTournaments();
    setTournaments(data.tournaments);
    setLoading(false);
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleJoin = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setJoining(id);
    try {
      await api.joinTournament(id);
      await fetchTournaments();
    } catch {
      // ignore
    } finally {
      setJoining(null);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tournaments</h1>
        <p className="text-gray-500 text-sm mt-1">
          Join a tournament to see matches and place your predictions
        </p>
      </div>

      {tournaments.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400">No tournaments yet</p>
          <p className="text-gray-400 text-sm mt-1">Ask your admin to create a tournament</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tournaments.map((t) => (
            <div
              key={t.id}
              onClick={() => t.joined ? onSelect(t.id) : undefined}
              className={`card p-5 text-left transition-all ${
                t.joined
                  ? 'hover:shadow-md cursor-pointer hover:border-primary-200'
                  : 'opacity-90'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">{t.name}</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {t.match_count} match{t.match_count !== 1 ? 'es' : ''}
                    <span className="mx-1.5 text-gray-300">|</span>
                    {t.member_count} player{t.member_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    t.status === 'active'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {t.status === 'active' ? 'Active' : 'Finished'}
                </span>
              </div>
              {t.description && (
                <p className="text-xs text-gray-500 mt-2">{t.description}</p>
              )}
              {t.status === 'finished' && t.winner_team && (
                <div className="mt-3 space-y-0.5">
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
              <div className="mt-3">
                {t.joined ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Joined
                  </span>
                ) : (
                  <button
                    onClick={(e) => handleJoin(e, t.id)}
                    disabled={joining === t.id}
                    className="btn-primary btn-sm"
                  >
                    {joining === t.id ? 'Joining...' : 'Join Tournament'}
                  </button>
                )}
              </div>
            </div>
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
  const [canSubmitTournamentTip, setCanSubmitTournamentTip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'finished'>('upcoming');

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
      setCanSubmitTournamentTip(data.canSubmitTournamentTip);

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

  const handleLeaveTournament = async () => {
    if (!confirm('Leave this tournament? Your tips will remain but you won\'t be visible on the leaderboard.')) return;
    try {
      await api.leaveTournament(id);
      onBack();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isUpcoming = (match: Match) =>
    match.status === 'upcoming' && new Date(match.kickoff) > new Date();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}. ${hours}:${minutes}`;
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

  const teamNames = useMemo(() => {
    const names = new Set<string>();
    matches.forEach((m) => {
      // Skip placeholder matches (e.g. QF1 vs QF1, Bronze vs Bronze)
      if (m.home_team === m.away_team) return;
      names.add(m.home_team);
      names.add(m.away_team);
    });
    return Array.from(names).sort();
  }, [matches]);

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
        <p className="text-gray-400">Tournament not found</p>
        <button onClick={onBack} className="btn-primary mt-4">Go back</button>
      </div>
    );
  }

  const myTournamentTip = tournamentTips[user!.id];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 truncate">{tournament.name}</h1>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                tournament.status === 'active'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {tournament.status === 'active' ? 'Active' : 'Finished'}
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-0.5">
            {matches.length} match{matches.length !== 1 ? 'es' : ''}
            <span className="mx-1.5 text-gray-300">|</span>
            {users.length} player{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleLeaveTournament}
          className="btn-secondary btn-sm !text-xs !text-gray-400 hover:!text-red-600"
        >
          Leave
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-2 rounded-xl text-sm border border-red-200">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Tournament predictions card */}
      <div className="card p-4">
        <h2 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
          Tournament Predictions
        </h2>

        {tournament.status === 'finished' && tournament.winner_team && (
          <div className="mb-3 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
            <p className="text-sm font-medium text-emerald-800">
              Winner: <span className="font-bold">{tournament.winner_team}</span>
            </p>
            {tournament.best_scorer && (
              <p className="text-sm font-medium text-emerald-800 mt-0.5">
                Best Scorer: <span className="font-bold">{tournament.best_scorer}</span>
              </p>
            )}
          </div>
        )}

        {canSubmitTournamentTip ? (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="label">Winning Team</label>
                <TeamAutocomplete
                  value={winningTeam}
                  onChange={setWinningTeam}
                  teams={teamNames}
                  placeholder="e.g. Finland"
                />
              </div>
              <div>
                <label className="label">Best Scorer</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Connor McDavid"
                  value={bestScorer}
                  onChange={(e) => setBestScorer(e.target.value)}
                />
              </div>
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
        ) : tournament.status === 'active' && !canSubmitTournamentTip ? (
          myTournamentTip ? (
            <div className="space-y-0.5">
              <p className="text-sm text-gray-600">
                Winner: <span className="font-semibold text-gray-900">{myTournamentTip.winningTeam}</span>
              </p>
              <p className="text-sm text-gray-600">
                Best Scorer: <span className="font-semibold text-gray-900">{myTournamentTip.bestScorer}</span>
              </p>
              <p className="text-xs text-gray-400 mt-2 italic">Tournament predictions are locked (first match has started)</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Tournament predictions are locked (first match has started)</p>
          )
        ) : myTournamentTip ? (
          <div className="space-y-0.5">
            <p className="text-sm text-gray-600">
              Winner:{' '}
              <span className={`font-semibold ${
                tournament.winner_team && myTournamentTip.winningTeam.toLowerCase() === tournament.winner_team.toLowerCase()
                  ? 'text-emerald-600' : tournament.status === 'finished' ? 'text-red-500' : 'text-gray-900'
              }`}>
                {myTournamentTip.winningTeam}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              Best Scorer:{' '}
              <span className={`font-semibold ${
                tournament.best_scorer && myTournamentTip.bestScorer.toLowerCase() === tournament.best_scorer.toLowerCase()
                  ? 'text-emerald-600' : tournament.status === 'finished' ? 'text-red-500' : 'text-gray-900'
              }`}>
                {myTournamentTip.bestScorer}
              </span>
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No prediction submitted</p>
        )}

        {tournament.status === 'finished' && otherUsers.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Other predictions
            </p>
            <div className="space-y-1.5">
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
                  <div key={u.id} className="text-xs bg-gray-50 px-2.5 py-1.5 rounded-lg">
                    <span className="font-medium text-gray-700">{u.username}</span>
                    <span className="mx-1 text-gray-300">—</span>
                    <span className={winnerCorrect ? 'text-emerald-600 font-semibold' : 'text-gray-500'}>
                      {tip.winningTeam}
                    </span>
                    <span className="mx-1 text-gray-300">/</span>
                    <span className={scorerCorrect ? 'text-emerald-600 font-semibold' : 'text-gray-500'}>
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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Matches</h2>
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {(['upcoming', 'finished', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all ${
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

      {/* Compact matches list */}
      {filteredMatches.length === 0 && matches.length > 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-400 text-sm">No matches found</p>
          <p className="text-gray-400 text-xs mt-1">Try a different filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMatches.map((match) => {
            const upcoming = isUpcoming(match);
            const myTip = match.tips[user!.id];
            const tipInput = tipInputs[match.id] || { home: '', away: '' };

            return (
              <div key={match.id} className="card">
                {/* Compact match header */}
                <div className="px-3 sm:px-4 py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-400">
                      {formatDate(match.kickoff)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        match.status === 'upcoming'
                          ? 'bg-blue-50 text-blue-600'
                          : match.status === 'live'
                          ? 'bg-red-50 text-red-600 animate-pulse'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {match.status === 'upcoming' ? 'Upcoming' : match.status === 'live' ? 'LIVE' : 'Finished'}
                    </span>
                  </div>

                  {/* Score row */}
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-sm font-semibold text-gray-900 text-right flex-1 truncate">
                      {match.home_team}
                    </span>
                    <div className="flex items-center gap-1.5 min-w-[60px] justify-center">
                      {match.status === 'finished' && match.home_score != null ? (
                        <span className="text-lg font-bold text-gray-900 tabular-nums">
                          {match.home_score} - {match.away_score}
                        </span>
                      ) : match.status === 'live' && match.home_score != null ? (
                        <span className="text-lg font-bold text-red-600 tabular-nums">
                          {match.home_score} - {match.away_score}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-300 font-medium">vs</span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 text-left flex-1 truncate">
                      {match.away_team}
                    </span>
                  </div>
                </div>

                {/* Tips section */}
                <div className="px-3 sm:px-4 pb-2.5 space-y-2">
                  {upcoming ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        className="input !w-12 text-center text-sm font-semibold !py-1 !px-1"
                        placeholder="-"
                        value={tipInput.home}
                        onChange={(e) => handleTipChange(match.id, 'home', e.target.value)}
                      />
                      <span className="text-gray-300 text-xs">:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        className="input !w-12 text-center text-sm font-semibold !py-1 !px-1"
                        placeholder="-"
                        value={tipInput.away}
                        onChange={(e) => handleTipChange(match.id, 'away', e.target.value)}
                      />
                      <button
                        onClick={() => submitMatchTip(match.id)}
                        disabled={savingTip === match.id || tipInput.home === '' || tipInput.away === ''}
                        className={`btn-sm ml-1 !text-[11px] !px-2 !py-1 ${
                          tipSuccess === match.id ? 'btn-success' : 'btn-primary'
                        }`}
                      >
                        {savingTip === match.id
                          ? '...'
                          : tipSuccess === match.id
                          ? 'OK'
                          : myTip
                          ? 'Update'
                          : 'Save'}
                      </button>
                    </div>
                  ) : myTip ? (
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${getTipResultClass(match, myTip)}`}>
                      Your tip: {myTip.homeScore}:{myTip.awayScore}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 italic">No tip</p>
                  )}

                  {!!match.tips_visible && otherUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {otherUsers.map((u) => {
                        const tip = match.tips[u.id];
                        if (!tip) {
                          return (
                            <span
                              key={u.id}
                              className="text-[11px] bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded"
                            >
                              {u.username} —
                            </span>
                          );
                        }
                        return (
                          <span
                            key={u.id}
                            className={`text-[11px] px-1.5 py-0.5 rounded ${getTipResultClass(match, tip) || 'bg-gray-50'}`}
                          >
                            <span className="font-medium text-gray-600">{u.username}</span>{' '}
                            <span className="font-bold text-gray-800">{tip.homeScore}:{tip.awayScore}</span>
                          </span>
                        );
                      })}
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
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 px-1">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Exact
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-400" /> Diff
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400" /> Outcome
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-200" /> Wrong
          </span>
        </div>
      )}
    </div>
  );
}
