import cron from 'node-cron';
import { getDb } from '../db/schema';
import { sendMatchReminderEmail } from './email';

export function startScheduler() {
  // Run every 10 minutes to check for matches starting within the next hour
  cron.schedule('*/10 * * * *', () => {
    checkAndSendReminders();
  });

  console.log('Match reminder scheduler started (checks every 10 minutes)');
}

function checkAndSendReminders() {
  const db = getDb();

  // Find upcoming matches that start between now and 1 hour from now
  // Only consider matches with real teams (home_team != away_team)
  const now = new Date().toISOString();
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const upcomingMatches = db
    .prepare(
      `SELECT m.id, m.home_team, m.away_team, m.kickoff, m.tournament_id
       FROM matches m
       WHERE m.status = 'upcoming'
         AND m.home_team != m.away_team
         AND m.kickoff > ?
         AND m.kickoff <= ?`
    )
    .all(now, oneHourFromNow) as any[];

  if (upcomingMatches.length === 0) return;

  const insertReminder = db.prepare(
    'INSERT OR IGNORE INTO sent_reminders (user_id, match_id) VALUES (?, ?)'
  );

  for (const match of upcomingMatches) {
    // Find tournament members who:
    // - have an email set
    // - have notifications enabled
    // - haven't submitted a tip for this match
    // - haven't already been sent a reminder for this match
    const usersToNotify = db
      .prepare(
        `SELECT u.id, u.username, u.email
         FROM users u
         JOIN tournament_members tm ON tm.user_id = u.id AND tm.tournament_id = ?
         WHERE u.email IS NOT NULL
           AND u.email_notifications = 1
           AND u.id NOT IN (
             SELECT t.user_id FROM tips t WHERE t.match_id = ?
           )
           AND u.id NOT IN (
             SELECT sr.user_id FROM sent_reminders sr WHERE sr.match_id = ?
           )`
      )
      .all(match.tournament_id, match.id, match.id) as any[];

    for (const user of usersToNotify) {
      sendMatchReminderEmail(user.email, user.username, [
        {
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          kickoff: match.kickoff,
        },
      ]).catch((err) => {
        console.error(`Failed to send reminder to ${user.email}:`, err);
      });

      // Mark reminder as sent
      insertReminder.run(user.id, match.id);
    }

    if (usersToNotify.length > 0) {
      console.log(
        `Sent reminders for ${match.home_team} vs ${match.away_team} to ${usersToNotify.length} user(s)`
      );
    }
  }
}
