# Tipovačka - Tipping Game

A web application for tipping game between multiple users. Users predict match results and earn points based on accuracy.

## Features

- **User Management**: Register, login, change password
- **Match Tipping**: Predict home and away scores for upcoming matches
- **Live Results**: See all users' predictions after match kickoff
- **Leaderboard**: Rankings with detailed stats (exact scores, correct diffs, correct outcomes)
- **Admin Panel**: Add matches, set results, configure scoring rules, manage users
- **Scoring System**: Configurable points for exact score, correct goal difference, correct outcome
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, SQLite (better-sqlite3), JWT auth
- **Frontend**: React, TypeScript, Vite, Tailwind CSS

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Start development (both server and client)
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Default Admin Account

- Username: `admin`
- Password: `admin123`

Change the password after first login.

## Scoring Rules (default, configurable by admin)

| Prediction Accuracy | Points |
|---|---|
| Exact score | 5 |
| Correct goal difference | 3 |
| Correct outcome (H/D/A) | 2 |

## Production Build

```bash
npm run build
npm start
```

This builds the frontend and serves it from the Express server on port 3001.

## Project Structure

```
tipovacka/
├── server/           # Express backend
│   └── src/
│       ├── index.ts          # Entry point
│       ├── db/schema.ts      # SQLite schema & seed
│       ├── middleware/auth.ts # JWT auth middleware
│       └── routes/           # API routes
│           ├── auth.ts       # Login, register, password
│           ├── matches.ts    # CRUD matches
│           ├── tips.ts       # Submit/update tips
│           ├── leaderboard.ts# Rankings & scoring
│           └── admin.ts      # Scoring rules & users
├── client/           # React frontend
│   └── src/
│       ├── App.tsx           # Routes
│       ├── contexts/         # Auth context
│       ├── components/       # Layout, shared UI
│       ├── lib/api.ts        # API client
│       └── pages/            # All pages
└── package.json      # Root scripts
```
