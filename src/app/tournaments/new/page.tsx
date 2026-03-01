'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Venue } from '@/types'

const DEFAULT_TEAM_COUNT = 4
const MAX_TEAMS = 8
const MIN_TEAMS = 2

function defaultTeamNames(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `チーム${i + 1}`)
}

export default function NewTournamentPage() {
  const router = useRouter()
  const supabase = createClient()

  const [venues, setVenues] = useState<Venue[]>([])
  const [venueId, setVenueId] = useState<string>('')
  const [title, setTitle] = useState('【会場名！】')
  const [subtitle, setSubtitle] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('2026年3月1日（日）')
  const [timeRange, setTimeRange] = useState('13:00～15:00')
  const [scheduleStart, setScheduleStart] = useState('13:00')
  const [scheduleInterval, setScheduleInterval] = useState(14)
  const [teamCount, setTeamCount] = useState(DEFAULT_TEAM_COUNT)
  const [teamNames, setTeamNames] = useState<string[]>(defaultTeamNames(DEFAULT_TEAM_COUNT))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch venues
  useEffect(() => {
    supabase
      .from('venues')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) {
          setVenues(data as Venue[])
          if (data.length > 0) setVenueId(data[0].id)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When venue changes, auto-fill title
  useEffect(() => {
    const venue = venues.find((v) => v.id === venueId)
    if (venue) {
      setTitle(`【${venue.name}】`)
    }
  }, [venueId, venues])

  // Adjust team names when count changes
  function handleTeamCountChange(n: number) {
    const clamped = Math.max(MIN_TEAMS, Math.min(MAX_TEAMS, n))
    setTeamCount(clamped)
    setTeamNames((prev) => {
      const updated = [...prev]
      if (clamped > prev.length) {
        for (let i = prev.length; i < clamped; i++) {
          updated.push(`チーム${i + 1}`)
        }
      }
      return updated.slice(0, clamped)
    })
  }

  function handleTeamNameChange(idx: number, val: string) {
    setTeamNames((prev) => {
      const updated = [...prev]
      updated[idx] = val
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // 1. Insert tournament
      const { data: tournament, error: tErr } = await supabase
        .from('tournaments')
        .insert({
          venue_id: venueId || null,
          title,
          subtitle,
          location,
          date,
          time_range: timeRange,
          schedule_start: scheduleStart,
          schedule_interval: scheduleInterval,
          created_by: user?.id ?? null,
        })
        .select()
        .single()

      if (tErr || !tournament) {
        throw new Error(tErr?.message ?? '大会の作成に失敗しました')
      }

      // 2. Insert teams (bulk)
      const teamRows = teamNames.slice(0, teamCount).map((name, position) => ({
        tournament_id: tournament.id,
        name,
        position,
      }))

      const { error: teamsErr } = await supabase.from('teams').insert(teamRows)

      if (teamsErr) {
        throw new Error(teamsErr.message)
      }

      // 3. Redirect to edit page
      router.push(`/tournaments/${tournament.id}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/tournaments"
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← 一覧に戻る
          </Link>
          <h1 className="text-lg font-bold text-gray-800">新しい対戦表を作成</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Venue */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">会場・基本情報</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                会場
              </label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">-- 会場を選択 --</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイトル
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="【会場名！】"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                サブタイトル
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="フットサル大会"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                場所
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="みなとフットサルコート"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  日付
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="2026年3月1日（日）"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  時間帯
                </label>
                <input
                  type="text"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="13:00～15:00"
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">スケジュール設定</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始時刻
                </label>
                <input
                  type="time"
                  value={scheduleStart}
                  onChange={(e) => setScheduleStart(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  試合間隔（分）
                </label>
                <input
                  type="number"
                  value={scheduleInterval}
                  min={5}
                  max={60}
                  onChange={(e) => setScheduleInterval(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          </div>

          {/* Teams */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">チーム設定</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                チーム数（{MIN_TEAMS}〜{MAX_TEAMS}）
              </label>
              <input
                type="number"
                value={teamCount}
                min={MIN_TEAMS}
                max={MAX_TEAMS}
                onChange={(e) => handleTeamCountChange(Number(e.target.value))}
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: teamCount }, (_, i) => (
                <div key={i}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    チーム {i + 1}
                  </label>
                  <input
                    type="text"
                    value={teamNames[i] ?? ''}
                    onChange={(e) => handleTeamNameChange(i, e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder={`チーム${i + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Link
              href="/tournaments"
              className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm"
            >
              {submitting ? '作成中...' : '対戦表を作成'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
