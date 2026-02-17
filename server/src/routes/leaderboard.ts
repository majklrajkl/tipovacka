import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { authRequired } from '../middleware/auth';

const router = Router();

router.get('/', authRequired, (req: Request, res: Response) => {
  const db = getDb();

  const rules = db.prepare('SELECT * FROM scoring_rules').all() as any[];
  const rulesMap: Record<string, number> = {};
  rules.forEach((r: any) => { rulesMap[r.key] = r.points; });

  const users = db.prepare('SELECT id, username FROM users').all() as any[];
  const finishedMatches = db.prepare(
    "SELECT * FROM matches WHERE status = 'finished' AND home_score IS NOT NULL"
  ).all() as any[];
  const tips = db.prepare('SELECT * FROM tips').all() as any[];

  // Tournament data
  const finishedTournaments = db.prepare(
    "SELECT * FROM tournaments WHERE status = 'finished'"
  ).all() as any[];
  const tournamentTips = db.prepare('SELECT * FROM tournament_tips').all() as any[];

  const leaderboard = users.map((user: any) => {
    let totalPoints = 0;
    let exactScores = 0;
    let correctOutcomes = 0;
    let correctDiffs = 0;
    let tipsCount = 0;
    let tournamentWinners = 0;
    let tournamentScorers = 0;

    finishedMatches.forEach((match: any) => {
      const tip = tips.find((t: any) => t.user_id === user.id && t.match_id === match.id);
      if (!tip) return;
      tipsCount++;

      const actualOutcome = match.home_score > match.away_score ? 'home'
        : match.home_score < match.away_score ? 'away' : 'draw';
      const tipOutcome = tip.home_score > tip.away_score ? 'home'
        : tip.home_score < tip.away_score ? 'away' : 'draw';

      // Exact score
      if (tip.home_score === match.home_score && tip.away_score === match.away_score) {
        totalPoints += rulesMap['exact_score'] || 5;
        exactScores++;
      }
      // Correct goal difference (but not exact score)
      else if (
        (tip.home_score - tip.away_score) === (match.home_score - match.away_score)
      ) {
        totalPoints += rulesMap['correct_goal_diff'] || 3;
        correctDiffs++;
      }
      // Correct outcome only
      else if (actualOutcome === tipOutcome) {
        totalPoints += rulesMap['correct_outcome'] || 2;
        correctOutcomes++;
      }
    });

    // Tournament points
    finishedTournaments.forEach((tournament: any) => {
      const tTip = tournamentTips.find(
        (t: any) => t.user_id === user.id && t.tournament_id === tournament.id
      );
      if (!tTip) return;

      if (tournament.winner_team && tTip.winning_team.toLowerCase() === tournament.winner_team.toLowerCase()) {
        totalPoints += rulesMap['tournament_winner'] || 10;
        tournamentWinners++;
      }
      if (tournament.best_scorer && tTip.best_scorer.toLowerCase() === tournament.best_scorer.toLowerCase()) {
        totalPoints += rulesMap['tournament_scorer'] || 10;
        tournamentScorers++;
      }
    });

    return {
      userId: user.id,
      username: user.username,
      totalPoints,
      exactScores,
      correctOutcomes,
      correctDiffs,
      tipsCount,
      matchesPlayed: finishedMatches.length,
      tournamentWinners,
      tournamentScorers,
    };
  });

  leaderboard.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    return b.correctDiffs - a.correctDiffs;
  });

  res.json({ leaderboard, rules });
});

export default router;
