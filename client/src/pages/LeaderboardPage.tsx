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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLeaderboard().then((data) => {
      setLeaderboard(data.leaderboard);
      setRules(data.rules);
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

  const getMedalColor = (index: number) => {
    if (index === 0) return 'text-yellow-500';
    if (index === 1) return 'text-gray-400';
    if (index === 2) return 'text-amber-600';
    return 'text-gray-300';
  };

  const getMedalBg = (index: number) => {
    if (index === 0) return 'bg-yellow-50 border-yellow-200';
    if (index === 1) return 'bg-gray-50 border-gray-200';
    if (index === 2) return 'bg-amber-50 border-amber-200';
    return 'border-gray-200';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
        <p className="text-gray-500 text-sm mt-1">See who's leading the tipping competition</p>
      </div>

      {/* Top 3 podium */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[1, 0, 2].map((idx) => {
            const entry = leaderboard[idx];
            if (!entry) return null;
            return (
              <div
                key={entry.userId}
                className={`card p-4 text-center border-2 ${getMedalBg(idx)} ${
                  idx === 0 ? 'transform sm:-translate-y-2' : ''
                }`}
              >
                <div className={`text-2xl sm:text-3xl font-bold ${getMedalColor(idx)} mb-1`}>
                  {idx === 0 ? '1st' : idx === 1 ? '2nd' : '3rd'}
                </div>
                <p className={`font-semibold text-gray-900 text-sm sm:text-base truncate ${
                  entry.userId === user?.id ? 'text-primary-600' : ''
                }`}>
                  {entry.username}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{entry.totalPoints}</p>
                <p className="text-xs text-gray-500">points</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                #
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 sm:px-6 py-3">
                Player
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 sm:px-4 py-3">
                Pts
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 sm:px-4 py-3 hidden sm:table-cell">
                Exact
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 sm:px-4 py-3 hidden sm:table-cell">
                Diff
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 sm:px-4 py-3 hidden sm:table-cell">
                Outcome
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 sm:px-4 py-3 hidden md:table-cell">
                Tips
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leaderboard.map((entry, idx) => (
              <tr
                key={entry.userId}
                className={`${
                  entry.userId === user?.id ? 'bg-primary-50' : 'hover:bg-gray-50'
                } transition-colors`}
              >
                <td className="px-4 sm:px-6 py-3">
                  <span className={`font-bold ${getMedalColor(idx)}`}>{idx + 1}</span>
                </td>
                <td className="px-4 sm:px-6 py-3">
                  <span className={`font-medium ${
                    entry.userId === user?.id ? 'text-primary-700' : 'text-gray-900'
                  }`}>
                    {entry.username}
                    {entry.userId === user?.id && (
                      <span className="text-xs text-primary-500 ml-1">(you)</span>
                    )}
                  </span>
                </td>
                <td className="px-2 sm:px-4 py-3 text-center">
                  <span className="text-lg font-bold text-gray-900">{entry.totalPoints}</span>
                </td>
                <td className="px-2 sm:px-4 py-3 text-center hidden sm:table-cell">
                  <span className="text-sm text-emerald-600 font-medium">{entry.exactScores}</span>
                </td>
                <td className="px-2 sm:px-4 py-3 text-center hidden sm:table-cell">
                  <span className="text-sm text-blue-600 font-medium">{entry.correctDiffs}</span>
                </td>
                <td className="px-2 sm:px-4 py-3 text-center hidden sm:table-cell">
                  <span className="text-sm text-yellow-600 font-medium">{entry.correctOutcomes}</span>
                </td>
                <td className="px-2 sm:px-4 py-3 text-center hidden md:table-cell">
                  <span className="text-sm text-gray-500">
                    {entry.tipsCount}/{entry.matchesPlayed}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leaderboard.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No results yet</p>
            <p className="text-sm mt-1">Leaderboard will update after matches are finished</p>
          </div>
        )}
      </div>

      {/* Scoring rules */}
      <div className="card p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Scoring Rules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
              <span className="text-sm text-gray-600">{rule.label}</span>
              <span className="text-lg font-bold text-primary-600">{rule.points}pt{rule.points !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
