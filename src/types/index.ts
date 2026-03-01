export type Role = 'admin' | 'venue_manager' | 'viewer'

export interface Venue {
  id: string
  name: string
  manager_id: string | null
  created_at: string
  updated_at: string
}

export interface UserRole {
  user_id: string
  role: Role
  venue_id: string | null
  created_at: string
}

export interface Tournament {
  id: string
  venue_id: string | null
  title: string
  subtitle: string
  location: string
  date: string
  time_range: string
  schedule_start: string
  schedule_interval: number
  rules: string
  created_by: string | null
  created_at: string
  updated_at: string
  // joined
  venues?: Venue | null
}

export interface Team {
  id: string
  tournament_id: string
  name: string
  position: number
  created_at: string
}

export interface MatchResult {
  id: string
  tournament_id: string
  team_a_idx: number
  team_b_idx: number
  game_number: number
  score_a: number | null
  score_b: number | null
  created_at: string
  updated_at: string
}

/** Normalized scores map: key = "min-max", value = { a, b } */
export type ScoresMap = Record<string, { a: number | null; b: number | null }>

export interface Standing {
  idx: number
  w: number
  d: number
  l: number
  scored: number
  conceded: number
  pts: number
}

export interface ScheduledMatch {
  no: number
  teamA: number
  teamB: number
  game: number
}
