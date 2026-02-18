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
    if (index === 0) return 'text-yellow-500';
    if (index === 1) return 'text-gray-400';
    if (index === 2) return 'text-amber-600';
    return 'text-gray-300';
  };

  const getMedalBg = (index: number) => {
    if (index === 0) return 'bg-gradient-to-b from-yellow-50 to-yellow-100/50 border-yellow-200';
    if (index === 1) return 'bg-gradient-to-b from-gray-50 to-gray-100/50 border-gray-200';
    if (index === 2) return 'bg-gradient-to-b from-amber-50 to-amber-100/50 border-amber-200';
    return 'border-gray-200';
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Leaderboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">See who's leading the competition</p>
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
        <div className="bg-primary-50/50 border border-primary-100 rounded-xl px-4 py-3">
          <p className="text-sm text-primary-800">{tournament.description}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
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
                      entry.userId === user?.id ? 'text-primary-600' : 'text-gray-900'
                    }`}>
                      {entry.username}
                    </p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">{entry.totalPoints}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">points</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full table */}
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 sm:px-4 py-2.5">
                    #
                  </th>
                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 sm:px-4 py-2.5">
                    Player
                  </th>
                  <th className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-2.5">
                    Pts
                  </th>
                  <th className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-2.5 hidden sm:table-cell">
                    Exact
                  </th>
                  <th className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-2.5 hidden sm:table-cell">
                    Diff
                  </th>
                  <th className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-2.5 hidden sm:table-cell">
                    Outcome
                  </th>
                  <th className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-2.5 hidden lg:table-cell">
                    Winner
                  </th>
                  <th className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-2.5 hidden lg:table-cell">
                    Scorer
                  </th>
                  <th className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-2.5 hidden md:table-cell">
                    Tips
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leaderboard.map((entry, idx) => (
                  <tr
                    key={entry.userId}
                    className={`${
                      entry.userId === user?.id ? 'bg-primary-50/60' : 'hover:bg-gray-50/50'
                    } transition-colors`}
                  >
                    <td className="px-3 sm:px-4 py-2.5">
                      <span className={`font-bold text-sm ${getMedalColor(idx)}`}>{idx + 1}</span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5">
                      <span className={`font-medium text-sm ${
                        entry.userId === user?.id ? 'text-primary-700' : 'text-gray-900'
                      }`}>
                        {entry.username}
                        {entry.userId === user?.id && (
                          <span className="text-[10px] text-primary-500 ml-1">(you)</span>
                        )}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className="text-base font-bold text-gray-900">{entry.totalPoints}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center hidden sm:table-cell">
                      <span className="text-xs text-emerald-600 font-semibold">{entry.exactScores}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center hidden sm:table-cell">
                      <span className="text-xs text-blue-600 font-semibold">{entry.correctDiffs}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center hidden sm:table-cell">
                      <span className="text-xs text-yellow-600 font-semibold">{entry.correctOutcomes}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center hidden lg:table-cell">
                      <span className="text-xs text-purple-600 font-semibold">{entry.tournamentWinners}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center hidden lg:table-cell">
                      <span className="text-xs text-purple-600 font-semibold">{entry.tournamentScorers}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center hidden md:table-cell">
                      <span className="text-xs text-gray-400">
                        {entry.tipsCount}/{entry.matchesPlayed}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leaderboard.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm">No results yet</p>
                <p className="text-xs mt-1">Leaderboard updates after matches finish</p>
              </div>
            )}
          </div>

          {/* Scoring rules */}
          <div className="card p-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Scoring Rules</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600">{rule.label}</span>
                  <span className="text-sm font-bold text-primary-600">{rule.points}pt{rule.points !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
            {/* Play Off rules */}
            {(() => {
              const matchRules = rules.filter((r) => ['exact_score', 'correct_goal_diff', 'correct_outcome'].includes(r.key));
              if (matchRules.length === 0) return null;
              return (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-2">Play Off Matches (2x points)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {matchRules.map((rule) => (
                      <div key={`po-${rule.id}`} className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2">
                        <span className="text-xs text-purple-700">{rule.label}</span>
                        <span className="text-sm font-bold text-purple-600">{rule.points * 2}pt{rule.points * 2 !== 1 ? 's' : ''}</span>
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
