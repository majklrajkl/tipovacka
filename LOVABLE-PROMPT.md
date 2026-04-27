# Lovable Prompt — Tipovacka (Sports Tipping Game)

Build a full-stack sports tipping (prediction) web app called **Tipovacka**. Users predict match scores, compete on leaderboards, and join tournaments. An admin panel manages everything. Come up with a clean, modern design that works well on both desktop and mobile.

---

## Database Schema

### users
- id (auto-increment PK)
- username (unique, 3-30 chars, only letters/numbers/underscores/dots/hyphens)
- email (unique, required)
- password (bcrypt hashed, min 6 chars)
- is_admin (boolean, default false)
- email_notifications (boolean, default true)
- failed_login_attempts (integer, default 0)
- locked_until (datetime, nullable)
- created_at (datetime)

### tournaments
- id (auto-increment PK)
- name (text, e.g. "MS Hokej 2026")
- description (text, optional)
- status (enum: 'active', 'finished')
- winner_team (text, nullable — set when finished)
- best_scorer (text, nullable — set when finished)
- created_at (datetime)

### matches
- id (auto-increment PK)
- home_team (text)
- away_team (text)
- kickoff (datetime with timezone)
- home_score (integer, nullable — null until result set)
- away_score (integer, nullable)
- status (enum: 'upcoming', 'live', 'finished')
- tournament_id (FK to tournaments, nullable, ON DELETE SET NULL)
- is_playoff (boolean, default false — playoff matches multiply points)
- created_at (datetime)

### tips (user match predictions)
- id (auto-increment PK)
- user_id (FK to users, ON DELETE CASCADE)
- match_id (FK to matches, ON DELETE CASCADE)
- home_score (integer, >= 0)
- away_score (integer, >= 0)
- created_at, updated_at (datetime)
- UNIQUE(user_id, match_id)

### tournament_tips (tournament winner/scorer predictions)
- id (auto-increment PK)
- user_id (FK to users)
- tournament_id (FK to tournaments)
- winning_team (text)
- best_scorer (text)
- created_at, updated_at (datetime)
- UNIQUE(user_id, tournament_id)

### tournament_members
- id (auto-increment PK)
- user_id (FK to users)
- tournament_id (FK to tournaments)
- paid (boolean, default false — admin tracks payments)
- joined_at (datetime)
- UNIQUE(user_id, tournament_id)

### scoring_rules
- id (auto-increment PK)
- key (unique text identifier)
- label (display name)
- points (integer)

**Default scoring rules (seeded on init):**
| Key | Label | Points |
|-----|-------|--------|
| exact_score | Exact score prediction | 5 |
| correct_goal_diff | Correct goal difference | 3 |
| correct_outcome | Correct outcome (win/draw/loss) | 2 |
| tournament_winner | Correct tournament winner | 10 |
| tournament_scorer | Correct tournament best scorer | 10 |
| playoff_multiplier | Play Off multiplier | 2 |

### password_reset_tokens
- id, user_id (FK), token (unique 64-char hex), expires_at (1 hour), used (boolean), created_at

### sent_reminders (prevent duplicate emails)
- id, user_id (FK), match_id (FK), sent_at
- UNIQUE(user_id, match_id)

### audit_log
- id, admin_user_id, admin_username, action, target_type, target_id, details, created_at

---

## Authentication & Security

### Registration
- Fields: username, email, password
- Username validation: 3-30 chars, regex `^[a-zA-Z0-9_.-]+$`
- Email must be valid and unique
- Password hashed with bcrypt (salt 10)
- Auto-login after registration (set httpOnly cookie)

### Login
- Fields: username, password
- **Account lockout:** After 5 failed attempts, lock for 15 minutes. Show "Account locked. Try again in X minute(s)."
- On success: reset failed attempts, set auth cookie

### Logout
- POST endpoint that clears auth cookies
- Client sets user to null

### Password Reset
1. Forgot password: enter email → server always says "If account exists, reset link sent" (prevents email enumeration)
2. Token sent via email, valid 1 hour
3. Reset page: enter new password, token cleaned from URL after extraction (security)

### Session
- JWT in httpOnly cookie (24h expiry)
- CSRF double-submit cookie: non-httpOnly `csrf` cookie + `X-CSRF-Token` header on all POST/PUT/DELETE
- On app load, call GET /auth/me to check session

### Rate Limiting
- General API: 100 req/15min
- Auth (login/register/forgot): 10 req/15min
- Password (reset/change): 5 req/15min

---

## Pages & Features

### 1. Login Page (`/login`)
- Centered card with username + password fields
- Error display
- Links to Register and Forgot Password
- Redirect to /tournaments if already logged in

### 2. Register Page (`/register`)
- Fields: username, email, password, confirm password
- Client validation: passwords must match
- Server validation: unique username, unique email, regex
- Link to Login

### 3. Forgot Password Page (`/forgot-password`)
- Email input
- Success message (always shows, prevents enumeration)
- Link back to login

### 4. Reset Password Page (`/reset-password?token=xxx`)
- Token extracted from URL then cleaned from browser history (replace URL)
- New password + confirm password
- Success: shows message + link to login
- Invalid token: shows error + link to request new one

### 5. Matches Page (`/matches`) — Main page for predictions
- **Header:** "Matches" title + count + filter pills (All / Upcoming / Finished)
- **Match cards:** Each match shows:
  - Date/time, status badge (Upcoming, Live, Finished — each visually distinct), playoff badge ("Play Off") if applicable
  - Home team vs Away team
  - If finished: actual score highlighted
  - If upcoming: "vs" text
  
- **Tip input (upcoming matches only, before kickoff):**
  - Two number inputs (home score, away score) side by side
  - Save button → shows "Saved!" briefly on success
  - Can update tip until kickoff

- **Tip results (after kickoff):**
  - User's prediction shown with visual indicator for accuracy:
    - Exact score match (best)
    - Correct goal difference
    - Correct outcome only
    - Wrong prediction
    - Each level should be visually distinct (e.g. different colors/borders)
  - Other users' tips shown in a grid (username + their prediction + accuracy indicator)
  - Users with no tip shown as "no tip"

- **Visibility rule:** Other users' tips are HIDDEN until match starts (prevents copying)

### 6. Tournaments Page (`/tournaments`)
- **List view:** Grid of tournament cards showing:
  - Name, description, status badge (Active/Finished)
  - Match count, member count
  - If finished: winner team + best scorer results
  - "Join" button or green "Joined ✓" indicator
  - Click card to view details (only if joined)

- **Detail view** (after clicking a joined tournament):
  - Back button, tournament name + status
  - Match count + member count
  - "Leave" button

  - **Tournament Predictions card:**
    - If active & before first match: form with team autocomplete + best scorer text input + Save button
    - If active & first match started: shows locked prediction (read-only)
    - If finished: shows prediction with visual indicator for correct/incorrect
    - If finished: table showing all members' predictions with correctness indicators

  - **Match list** (same functionality as Matches page but scoped to tournament)
    - Filter pills: Upcoming / Finished / All
    - Tip inputs for upcoming matches
    - Tip results with color coding

### 7. Leaderboard Page (`/leaderboard`)
- **Tournament selector:** dropdown to filter by tournament or "All"
- **Tournament description** shown if available (info box)
- **Podium (top 3):**
  - 3 cards in a row: 2nd | 1st (elevated) | 3rd
  - Visually distinguish 1st, 2nd, 3rd (e.g. gold/silver/bronze)
  - Shows username + total points
  - Highlights current user

- **Full table:**
  - Columns: Rank | Player | Points | Exact | Diff | Outcome | Winner | Scorer | Tips
  - Current user's row highlighted
  - Responsive: hides columns on mobile (show only Rank, Player, Points on small screens)
  - Sort: points desc → exact scores desc → goal diffs desc (tiebreakers)

- **Scoring Rules section:**
  - Grid of rule cards showing label + point value
  - **Play Off section:** shows doubled point values for playoff matches
  - Playoff multiplier value is dynamic (from scoring_rules table)
  - Hide the playoff_multiplier rule from regular rules display

### 8. Profile Page (`/profile`)
- **Account Info:** username, email, role (Admin/Player) — all read-only
- **Notifications:** toggle switch for email match reminders ("Get an email 1 hour before matches you haven't tipped yet")
- **Change Password:** current password + new password + confirm new password form

### 9. Admin Page (`/admin`) — Admin only, show "Access denied" for non-admins

**Tab navigation:** Matches | Tournaments | Scoring | Users | Members

#### Matches Tab
- **Create Match form:** home team, away team, kickoff datetime, tournament selector, playoff checkbox
- **Import from CSV:** collapsible section, textarea, format: `HomeTeam,AwayTeam,YYYY-MM-DDTHH:MM`, tournament selector, import button with error display
- **Match list:** each shows teams + datetime + status + playoff badge, with:
  - Score input fields + "Set" button (set result)
  - "PO" toggle button (toggle playoff status)
  - Delete button (with confirmation dialog)

#### Tournaments Tab
- **Create form:** name + description inputs
- **Tournament list:** each shows name + stats + status, with:
  - Edit description button
  - Finish button (if active) → opens form with team autocomplete + scorer input
  - Edit Results (if finished) → same form for updating
  - Delete button (with confirmation)

#### Scoring Tab
- List of all scoring rules with inline point editing
- Each rule: label + key + number input + Save button
- Suffix display: regular rules show "pts", playoff_multiplier shows "x"

#### Users Tab
- User list: username + join date + Admin/Player badge
- Per user (if not self): Promote/Demote admin toggle, Reset password (expandable), Delete (with confirmation)

#### Members Tab
- Grouped by tournament
- Each member: username + join date + Paid/Unpaid toggle button (visually distinct states)

---

## Navigation & Layout

### Header/Navbar
- Left: Logo "T" badge + "Tipovacka" text (hidden on mobile)
- Center: nav links — Tournaments, Leaderboard, Admin (admin only)
- Right: username → profile link, Sign Out button
- Mobile: hamburger menu toggling nav links
- Sticky top

### Route protection
- Public routes (login, register, forgot-password, reset-password): redirect to /tournaments if logged in
- Private routes (all others): redirect to /login if not logged in
- Admin page: accessible to all logged-in users but shows "Access denied" for non-admins
- Default redirect: unknown routes → /tournaments

---

## Scoring Logic (Backend)

For each **finished match**, for each user who submitted a tip:
```
multiplier = match.is_playoff ? playoff_multiplier_value : 1

if tip.home == actual.home AND tip.away == actual.away:
    points += exact_score * multiplier
else if (tip.home - tip.away) == (actual.home - actual.away):
    points += correct_goal_diff * multiplier
else if outcome(tip) == outcome(actual):    // win/draw/loss matches
    points += correct_outcome * multiplier
```

For each **finished tournament**, for each user with a tournament tip:
```
if tip.winning_team matches tournament.winner_team (case-insensitive):
    points += tournament_winner
if tip.best_scorer matches tournament.best_scorer (case-insensitive):
    points += tournament_scorer
```

Leaderboard sorted by: total points DESC, then exact scores DESC, then goal diffs DESC.

---

## Email System

### Password Reset Email
- Triggered when user requests password reset
- Contains button linking to `/reset-password?token=xxx`
- Token expires in 1 hour

### Match Reminder Email
- **Cron job** runs every 10 minutes
- Finds matches starting in next 60 minutes
- For each match, sends reminder to users who:
  - Are members of the tournament the match belongs to
  - Have email set AND notifications enabled
  - Haven't submitted a tip for the match yet
  - Haven't already received a reminder for this match
- Tracks sent reminders to prevent duplicates

---

## Key Behaviors

1. **Tips are hidden until kickoff** — users can't see others' predictions before the match starts
2. **Tips can be updated** until kickoff — upsert behavior
3. **Tournament tips deadline** — must predict winner/scorer before the first match of the tournament starts
4. **Scoring rules are retroactive** — changing point values recalculates all leaderboards instantly
5. **Playoff multiplier** — admin can toggle any match as "Play Off" for multiplied points
6. **Tournament isolation** — leaderboard can be filtered per tournament, only showing members
7. **Admin actions are audited** — logged in audit_log table
8. **Account lockout** — 5 failed logins = 15-minute lock

---

## Seed Data

Create a default tournament "MS Hokej 2026" with these ice hockey matches (all times in CEST, UTC+2):

**Group stage (May 15-26, 2026) — 56 matches total between these teams:**
Finland, Germany, Canada, Sweden, USA, Switzerland, Czechia, Denmark, Great Britain, Austria, Slovakia, Norway, Hungary, Italy, Latvia, Slovenia

**Knockout stage (May 28-31):**
- 4 Quarterfinals (May 28)
- 2 Semifinals (May 30)
- Bronze medal game (May 31)
- Gold medal game (May 31)

Use placeholder names "QF1 vs QF1" etc. for knockout matches (admin updates teams later).
