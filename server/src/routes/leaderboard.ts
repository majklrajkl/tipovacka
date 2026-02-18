import { Router, Request, Response } from 'express';
import { getDb } from '../db/schema';
import { authRequired } from '../middleware/auth';

const router = Router();

router.get('/', authRequired, (req: Request, res: Response) => {
  const db = getDb();
  const tournamentId = req.query.tournamentId ? Number(req.query.tournamentId) : null;

  const rules = db.prepare('SELECT * FROM scoring_rules').all() as any[];
  const rulesMap: Record<string, number> = {};
  rules.forEach((r: any) => { rulesMap[r.key] = r.points; });

  // If tournament-specific, only include members of that tournament
  let users: any[];
  if (tournamentId) {
    users = db.prepare(`
      SELECT u.id, u.username FROM users u
      JOIN tournament_members tm ON u.id = tm.user_id
      WHERE tm.tournament_id = ?
    `).all(tournamentId) as any[];
  } else {
    users = db.prepare('SELECT id, username FROM users').all() as any[];
  }

  // Filter matches by tournament if specified
  let finishedMatches: any[];
  if (tournamentId) {
    finishedMatches = db.prepare(
      "SELECT * FROM matches WHERE status = 'finished' AND home_score IS NOT NULL AND tournament_id = ?"
    ).all(tournamentId) as any[];
  } else {
    finishedMatches = db.prepare(
      "SELECT * FROM matches WHERE status = 'finished' AND home_score IS NOT NULL"
    ).all() as any[];
  }

  const tips = db.prepare('SELECT * FROM tips').all() as any[];

  // Tournament data
  let finishedTournaments: any[];
  if (tournamentId) {
    finishedTournaments = db.prepare(
      "SELECT * FROM tournaments WHERE status = 'finished' AND id = ?"
    ).all(tournamentId) as any[];
  } else {
    finishedTournaments = db.prepare(
      "SELECT * FROM tournaments WHERE status = 'finished'"
    ).all() as any[];
  }
  const tournamentTips = db.prepare('SELECT * FROM tournament_tips').all() as any[];

  // Get tournament info for description
  let tournament: any = null;
  if (tournamentId) {
    tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
  }

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

      const multiplier = match.is_playoff ? (rulesMap['playoff_multiplier'] || 2) : 1;

      const actualOutcome = match.home_score > match.away_score ? 'home'
        : match.home_score < match.away_score ? 'away' : 'draw';
      const tipOutcome = tip.home_score > tip.away_score ? 'home'
        : tip.home_score < tip.away_score ? 'away' : 'draw';

      if (tip.home_score === match.home_score && tip.away_score === match.away_score) {
        totalPoints += (rulesMap['exact_score'] || 5) * multiplier;
        exactScores++;
      } else if (
        (tip.home_score - tip.away_score) === (match.home_score - match.away_score)
      ) {
        totalPoints += (rulesMap['correct_goal_diff'] || 3) * multiplier;
        correctDiffs++;
      } else if (actualOutcome === tipOutcome) {
        totalPoints += (rulesMap['correct_outcome'] || 2) * multiplier;
        correctOutcomes++;
      }
    });

    finishedTournaments.forEach((t: any) => {
      const tTip = tournamentTips.find(
        (tt: any) => tt.user_id === user.id && tt.tournament_id === t.id
      );
      if (!tTip) return;

      if (t.winner_team && tTip.winning_team.toLowerCase() === t.winner_team.toLowerCase()) {
        totalPoints += rulesMap['tournament_winner'] || 10;
        tournamentWinners++;
      }
      if (t.best_scorer && tTip.best_scorer.toLowerCase() === t.best_scorer.toLowerCase()) {
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

  res.json({ leaderboard, rules, tournament });
});

export default router;
