import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { canEdit } from '@/lib/permissions'
import { resultsToScoresMap } from '@/lib/standings'
import TournamentDocument from '@/components/document/TournamentDocument'
import type { Tournament, Team, MatchResult, UserRole } from '@/types'
import PrintButton from './PrintButton'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TournamentViewPage({ params }: Props) {
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
  const editable = canEdit(role, t)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - no-print */}
      <header className="no-print bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/tournaments"
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← 一覧
            </Link>
            <h1 className="text-base font-bold text-gray-800 truncate max-w-xs sm:max-w-sm">
              {t.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {editable && (
              <Link
                href={`/tournaments/${id}/edit`}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                編集する
              </Link>
            )}
            <PrintButton />
          </div>
        </div>
      </header>

      {/* Document area */}
      <main className="py-6 px-2">
        {/* Mobile: scale down for small screens */}
        <div
          className="origin-top-left md:origin-top mx-auto"
          style={{
            /* On mobile, scale the A4 document to fit viewport */
            transform: undefined,
          }}
        >
          <div className="overflow-x-auto">
            <div className="min-w-[1123px]">
              <TournamentDocument
                tournament={t}
                teams={teams}
                scores={scores}
                editable={false}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
