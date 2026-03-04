import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface LeaderboardEntry {
  userId: number;
  username: string;
  totalPoints: number;
  exactScores: number;
  correctOutcomes: number;
  correctDiffs: number;
  tipsCount: number;
  matchesPlayed: number;
  tournamentWinners: number;
  tournamentScorers: number;
}

interface ScoringRule {
  id: number;
  key: string;
  label: string;
  points: number;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTournaments().then((data) => setTournaments(data.tournaments));
  }, []);

  const fetchLeaderboard = async (tournamentId?: number | null) => {
    setLoading(true);
    const data = await api.getLeaderboard(tournamentId);
    setLeaderboard(data.leaderboard);
    setRules(data.rules);
    setTournament(data.tournament);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard(selectedTournamentId ? Number(selectedTournamentId) : null);
  }, [selectedTournamentId]);

  const getMedalColor = (index: number) => {
    if (index === 0) return 'text-yellow-400';
    if (index === 1) return 'text-gray-400';
    if (index === 2) return 'text-amber-500';
    return 'text-muted-dark';
  };

  const getMedalBg = (index: number) => {
    if (index === 0) return 'bg-yellow-400/10 border-yellow-400/30';
    if (index === 1) return 'bg-gray-400/10 border-gray-400/30';
    if (index === 2) return 'bg-amber-400/10 border-amber-400/30';
    return 'border-surface-500/50';
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Leaderboard</h1>
          <p className="text-muted text-sm mt-0.5">See who's leading the competition</p>
        </div>
        <div className="w-full sm:w-auto">
          <select
            className="input !w-full sm:!w-48"
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
          >
            <option value="">All tournaments</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tournament description */}
      {tournament?.description && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">
          <p className="text-sm text-accent">{tournament.description}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {leaderboard.length >= 3 && (
            <div className="grid grid-cols-3 gap-2">
              {[1, 0, 2].map((idx) => {
                const entry = leaderboard[idx];
                if (!entry) return null;
                return (
                  <div
                    key={entry.userId}
                    className={`card p-3 text-center border-2 ${getMedalBg(idx)} ${
                      idx === 0 ? 'transform sm:-translate-y-1' : ''
                    }`}
                  >
                    <div className={`text-xl sm:text-2xl font-bold ${getMedalColor(idx)} mb-0.5`}>
                      {idx === 0 ? '1st' : idx === 1 ? '2nd' : '3rd'}
                    </div>
                    <p className={`font-semibold text-sm truncate ${
                      entry.userId === user?.id ? 'text-accent' : 'text-white'
                    }`}>
                      {entry.username}
                    </p>
                    <p className="text-xl font-bold text-white mt-0.5">{entry.totalPoints}</p>
                    <p className="text-[10px] text-muted uppercase tracking-wider">points</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full table */}
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-500/30 bg-surface-900/50">
                  <th className="text-left text-[10px] font-semibold text-muted-dark uppercase tracking-wider px-3 sm:px-4 py-2.5">
                    #
                  </th>
                  <th className="text-left text-[10px] font-semibold text-muted-dark uppercase tracking-wider px-3 sm:px-4 py-2.5">
                    Player
                  </th>
                  <th className="text-center text-[10px] font-semibold text-muted-dark uppercase tracking-wider px-2 py-2.5">
                    Pts
                  </th>
                  <th className="text-center text-[10px] font-semibold text-muted-dark uppercase tracking-wider px-2 py-2.5 hidden sm:table-cell">
                    Exact
                  </th>
                  <th className="text-center text-[10px] font-semibold text-muted-dark uppercase tracking-wider px-2 py-2.5 hidden sm:table-cell">
                    Diff
                  </th>
                  <th className="text-center text-[10px] font-semibold text-muted-dark uppercase tracking-wider px-2 py-2.5 hidden sm:table-cell">
                    Outcome
                  </th>
                  <th className="text-center text-[10px] font-semibold text-muted-dark uppercase tracking-wider px-2 py-2.5 hidden lg:table-cell">
                    Winner
                  </th>
                  <th className="text-center text-[10px] font-semibold text-muted-dark uppercase tracking-wider px-2 py-2.5 hidden lg:table-cell">
                    Scorer
                  </th>
                  <th className="text-center text-[10px] font-semibold text-muted-dark uppercase tracking-wider px-2 py-2.5 hidden md:table-cell">
                    Tips
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-500/20">
                {leaderboard.map((entry, idx) => (
                  <tr
                    key={entry.userId}
                    className={`${
                      entry.userId === user?.id ? 'bg-accent/10' : 'hover:bg-surface-600/30'
                    } transition-colors`}
                  >
                    <td className="px-3 sm:px-4 py-2.5">
                      <span className={`font-bold text-sm ${getMedalColor(idx)}`}>{idx + 1}</span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5">
                      <span className={`font-medium text-sm ${
                        entry.userId === user?.id ? 'text-accent' : 'text-white'
                      }`}>
                        {entry.username}
                        {entry.userId === user?.id && (
                          <span className="text-[10px] text-accent/70 ml-1">(you)</span>
                        )}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className="text-base font-bold text-white">{entry.totalPoints}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center hidden sm:table-cell">
                      <span className="text-xs text-emerald-400 font-semibold">{entry.exactScores}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center hidden sm:table-cell">
                      <span className="text-xs text-blue-400 font-semibold">{entry.correctDiffs}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center hidden sm:table-cell">
                      <span className="text-xs text-yellow-400 font-semibold">{entry.correctOutcomes}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center hidden lg:table-cell">
                      <span className="text-xs text-purple-400 font-semibold">{entry.tournamentWinners}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center hidden lg:table-cell">
                      <span className="text-xs text-purple-400 font-semibold">{entry.tournamentScorers}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center hidden md:table-cell">
                      <span className="text-xs text-muted-dark">
                        {entry.tipsCount}/{entry.matchesPlayed}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leaderboard.length === 0 && (
              <div className="text-center py-10 text-muted-dark">
                <p className="text-sm">No results yet</p>
                <p className="text-xs mt-1">Leaderboard updates after matches finish</p>
              </div>
            )}
          </div>

          {/* Scoring rules */}
          <div className="card p-4">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2.5">Scoring Rules</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {rules.filter((r) => r.key !== 'playoff_multiplier').map((rule) => (
                <div key={rule.id} className="flex items-center justify-between bg-surface-600/50 rounded-lg px-3 py-2">
                  <span className="text-xs text-muted">{rule.label}</span>
                  <span className="text-sm font-bold text-accent">{rule.points}pt{rule.points !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
            {/* Play Off rules */}
            {(() => {
              const matchRules = rules.filter((r) => ['exact_score', 'correct_goal_diff', 'correct_outcome'].includes(r.key));
              const multiplierRule = rules.find((r) => r.key === 'playoff_multiplier');
              const multiplier = multiplierRule ? multiplierRule.points : 2;
              if (matchRules.length === 0) return null;
              return (
                <div className="mt-3 pt-3 border-t border-surface-500/30">
                  <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">Play Off Matches ({multiplier}x points)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {matchRules.map((rule) => (
                      <div key={`po-${rule.id}`} className="flex items-center justify-between bg-purple-400/10 rounded-lg px-3 py-2">
                        <span className="text-xs text-purple-300">{rule.label}</span>
                        <span className="text-sm font-bold text-purple-400">{rule.points * multiplier}pt{rule.points * multiplier !== 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
