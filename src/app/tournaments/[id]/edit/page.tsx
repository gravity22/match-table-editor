import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canEdit } from '@/lib/permissions'
import { resultsToScoresMap } from '@/lib/standings'
import type { Tournament, Team, MatchResult, UserRole } from '@/types'
import TournamentEditClient from './TournamentEditClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TournamentEditPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch tournament
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*, venues(name)')
    .eq('id', id)
    .single()

  if (!tournament) {
    notFound()
  }

  // Fetch teams
  const { data: teamsData } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', id)
    .order('position')

  // Fetch match results
  const { data: resultsData } = await supabase
    .from('match_results')
    .select('*')
    .eq('tournament_id', id)

  // Get user role
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const t = tournament as Tournament
  const teams = (teamsData ?? []) as Team[]
  const results = (resultsData ?? []) as MatchResult[]
  const scores = resultsToScoresMap(results)
  const role = userRole as UserRole | null

  // Permission check
  if (!canEdit(role, t)) {
    redirect(`/tournaments/${id}`)
  }

  return (
    <TournamentEditClient
      tournament={t}
      initialTeams={teams}
      initialScores={scores}
      canEditRules={role?.role === 'admin'}
    />
  )
}
