import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  is_playoff: number;
  tips_visible: number;
  tips: Record<number, { homeScore: number; awayScore: number }>;
}

interface UserInfo {
  id: number;
  username: string;
}

export default function MatchesPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tipInputs, setTipInputs] = useState<Record<number, { home: string; away: string }>>({});
  const [savingTip, setSavingTip] = useState<number | null>(null);
  const [tipSuccess, setTipSuccess] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'finished'>('all');

  const fetchData = async () => {
    try {
      const data = await api.getMatches();
      setMatches(data.matches);
      setUsers(data.users);
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
  }, []);

  const handleTipChange = (matchId: number, field: 'home' | 'away', value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setTipInputs((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value },
    }));
  };

  const submitTip = async (matchId: number) => {
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
    if (homeScore > awayScore) return { label: 'H', cls: 'bg-blue-500/20 text-blue-400' };
    if (homeScore < awayScore) return { label: 'A', cls: 'bg-orange-500/20 text-orange-400' };
    return { label: 'D', cls: 'bg-surface-600 text-muted' };
  };

  const getTipResultClass = (match: Match, tip: { homeScore: number; awayScore: number }) => {
    if (match.status !== 'finished' || match.home_score == null || match.away_score == null) return '';
    if (tip.homeScore === match.home_score && tip.awayScore === match.away_score) {
      return 'ring-2 ring-emerald-400 bg-emerald-400/15';
    }
    const tipDiff = tip.homeScore - tip.awayScore;
    const matchDiff = match.home_score - match.away_score;
    if (tipDiff === matchDiff) {
      return 'ring-2 ring-blue-400 bg-blue-400/15';
    }
    const tipOutcome = tip.homeScore > tip.awayScore ? 'H' : tip.homeScore < tip.awayScore ? 'A' : 'D';
    const matchOutcome = match.home_score > match.away_score ? 'H' : match.home_score < match.away_score ? 'A' : 'D';
    if (tipOutcome === matchOutcome) {
      return 'ring-2 ring-yellow-400 bg-yellow-400/15';
    }
    return 'bg-red-400/15';
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Matches</h1>
          <p className="text-muted text-sm mt-1">
            {matches.length} match{matches.length !== 1 ? 'es' : ''} total
          </p>
        </div>
        <div className="flex gap-1 bg-surface-800 rounded-full p-1 border border-surface-500/50">
          {(['all', 'upcoming', 'finished'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-accent text-surface-900'
                  : 'text-muted hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/15 text-red-400 px-4 py-3 rounded-lg text-sm border border-red-500/20">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {filteredMatches.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted text-lg">No matches found</p>
          <p className="text-muted-dark text-sm mt-1">
            {filter !== 'all' ? 'Try a different filter' : 'Ask your admin to add some matches'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match) => {
            const upcoming = isUpcoming(match);
            const myTip = match.tips[user!.id];
            const tipInput = tipInputs[match.id] || { home: '', away: '' };

            return (
              <div key={match.id} className="card">
                {/* Match header */}
                <div className="px-4 sm:px-6 py-4 border-b border-surface-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-dark font-medium">
                        {formatDate(match.kickoff)}
                      </span>
                      {!!match.is_playoff && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-400/15 text-purple-400">
                          Play Off
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        match.status === 'upcoming'
                          ? 'bg-blue-500/15 text-blue-400'
                          : match.status === 'live'
                          ? 'bg-red-500/15 text-red-400'
                          : 'bg-surface-600 text-muted'
                      }`}
                    >
                      {match.status === 'upcoming' ? 'Upcoming' : match.status === 'live' ? 'Live' : 'Finished'}
                    </span>
                  </div>

                  {/* Score display */}
                  <div className="flex items-center justify-center gap-4 mt-3">
                    <span className="text-base sm:text-lg font-semibold text-white text-right flex-1">
                      {match.home_team}
                    </span>
                    <div className="flex items-center gap-2 min-w-[80px] justify-center">
                      {match.status === 'finished' && match.home_score != null ? (
                        <span className="text-2xl font-bold text-accent">
                          {match.home_score} - {match.away_score}
                        </span>
                      ) : (
                        <span className="text-lg text-muted-dark">vs</span>
                      )}
                    </div>
                    <span className="text-base sm:text-lg font-semibold text-white text-left flex-1">
                      {match.away_team}
                    </span>
                  </div>
                </div>

                {/* Tip section */}
                <div className="px-4 sm:px-6 py-4">
                  {/* My tip */}
                  {upcoming ? (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
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
                        <span className="text-muted-dark font-medium">:</span>
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
                          onClick={() => submitTip(match.id)}
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
                      <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
                        Your prediction
                      </p>
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${getTipResultClass(match, myTip)}`}>
                        <span className="text-white">{myTip.homeScore} : {myTip.awayScore}</span>
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
                      <p className="text-xs text-muted-dark italic">No prediction submitted</p>
                    </div>
                  )}

                  {/* Other users' tips - only visible after kickoff */}
                  {match.tips_visible && otherUsers.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
                        Other predictions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {otherUsers.map((u) => {
                          const tip = match.tips[u.id];
                          if (!tip) {
                            return (
                              <div
                                key={u.id}
                                className="text-xs bg-surface-600/50 text-muted-dark px-2.5 py-1.5 rounded-lg"
                              >
                                <span className="font-medium">{u.username}</span>{' '}
                                <span className="italic">no tip</span>
                              </div>
                            );
                          }
                          return (
                            <div
                              key={u.id}
                              className={`text-xs px-2.5 py-1.5 rounded-lg ${getTipResultClass(match, tip) || 'bg-surface-600/50'}`}
                            >
                              <span className="font-medium text-muted-light">{u.username}</span>{' '}
                              <span className="font-semibold text-white">
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
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Tip results legend</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-light">
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
              <span className="w-3 h-3 rounded bg-red-400/50 inline-block" /> Wrong
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
