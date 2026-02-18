const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (username: string, password: string, email: string) =>
    request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
  updateNotifications: (emailNotifications: boolean) =>
    request<{ message: string }>('/auth/notifications', {
      method: 'PUT',
      body: JSON.stringify({ emailNotifications }),
    }),
  getMe: () => request<{ user: any }>('/auth/me'),

  // Matches
  getMatches: () => request<{ matches: any[]; users: any[] }>('/matches'),
  createMatch: (homeTeam: string, awayTeam: string, kickoff: string, tournamentId?: number | null) =>
    request<any>('/matches', {
      method: 'POST',
      body: JSON.stringify({ homeTeam, awayTeam, kickoff, tournamentId }),
    }),
  updateMatchResult: (id: number, homeScore: number, awayScore: number, status: string) =>
    request<any>(`/matches/${id}/result`, {
      method: 'PUT',
      body: JSON.stringify({ homeScore, awayScore, status }),
    }),
  updateMatch: (id: number, data: any) =>
    request<any>(`/matches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteMatch: (id: number) =>
    request<any>(`/matches/${id}`, { method: 'DELETE' }),
  importMatches: (matches: { homeTeam: string; awayTeam: string; kickoff: string }[], tournamentId?: number | null) =>
    request<{ imported: number; errors: string[] }>('/matches/import', {
      method: 'POST',
      body: JSON.stringify({ matches, tournamentId }),
    }),

  // Tips
  submitTip: (matchId: number, homeScore: number, awayScore: number) =>
    request<any>('/tips', {
      method: 'POST',
      body: JSON.stringify({ matchId, homeScore, awayScore }),
    }),

  // Leaderboard
  getLeaderboard: (tournamentId?: number | null) =>
    request<{ leaderboard: any[]; rules: any[]; tournament: any }>(
      tournamentId ? `/leaderboard?tournamentId=${tournamentId}` : '/leaderboard'
    ),

  // Admin
  getScoringRules: () => request<{ rules: any[] }>('/admin/scoring-rules'),
  updateScoringRule: (id: number, points: number) =>
    request<any>(`/admin/scoring-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ points }),
    }),
  getUsers: () => request<{ users: any[] }>('/admin/users'),
  toggleAdmin: (id: number) =>
    request<any>(`/admin/users/${id}/toggle-admin`, { method: 'PUT' }),
  resetUserPassword: (id: number, newPassword: string) =>
    request<any>(`/admin/users/${id}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    }),
  getTournamentMembers: () =>
    request<{ members: any[] }>('/admin/tournament-members'),
  toggleMemberPaid: (userId: number, tournamentId: number) =>
    request<any>(`/admin/tournament-members/${userId}/${tournamentId}/paid`, {
      method: 'PUT',
    }),

  // Tournaments
  getTournaments: () => request<{ tournaments: any[] }>('/tournaments'),
  getTournament: (id: number) =>
    request<{ tournament: any; matches: any[]; users: any[]; tournamentTips: Record<number, any>; canSubmitTournamentTip: boolean }>(`/tournaments/${id}`),
  createTournament: (name: string, description?: string) =>
    request<any>('/tournaments', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),
  updateTournament: (id: number, data: { name?: string; status?: string; winnerTeam?: string; bestScorer?: string; description?: string }) =>
    request<any>(`/tournaments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTournament: (id: number) =>
    request<any>(`/tournaments/${id}`, { method: 'DELETE' }),
  joinTournament: (id: number) =>
    request<any>(`/tournaments/${id}/join`, { method: 'POST' }),
  leaveTournament: (id: number) =>
    request<any>(`/tournaments/${id}/leave`, { method: 'POST' }),
  getTournamentTeams: (id: number) =>
    request<{ teams: string[] }>(`/tournaments/${id}/teams`),
  submitTournamentTip: (tournamentId: number, winningTeam: string, bestScorer: string) =>
    request<any>(`/tournaments/${tournamentId}/tips`, {
      method: 'POST',
      body: JSON.stringify({ winningTeam, bestScorer }),
    }),
};
