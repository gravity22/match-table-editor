'use client'

import { useState, useRef, useCallback } from 'react'

// ---------- Date / time helpers ----------
function toDateInputValue(jaDate: string): string {
  const m = jaDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (!m) return ''
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

function toJaDate(iso: string): string {
  if (!iso) return ''
  const [y, mo, d] = iso.split('-').map(Number)
  const dow = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, mo - 1, d).getDay()]
  return `${y}年${mo}月${d}日（${dow}）`
}

function parseTimeRange(tr: string): { start: string; end: string } {
  const m = tr.match(/^(\d{2}:\d{2})～(\d{2}:\d{2})$/)
  return m ? { start: m[1], end: m[2] } : { start: '', end: '' }
}
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TournamentDocument from '@/components/document/TournamentDocument'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { sKey } from '@/lib/standings'
import type { Tournament, Team, ScoresMap } from '@/types'

type SaveStatus = 'saved' | 'saving' | 'unsaved'

interface Props {
  tournament: Tournament
  initialTeams: Team[]
  initialScores: ScoresMap
  canEditRules?: boolean
}

export default function TournamentEditClient({
  tournament,
  initialTeams,
  initialScores,
  canEditRules = false,
}: Props) {
  const supabase = createClient()

  // Tournament fields
  const [title, setTitle] = useState(tournament.title)
  const [subtitle, setSubtitle] = useState(tournament.subtitle ?? '')
  const [location, setLocation] = useState(tournament.location ?? '')
  const [date, setDate] = useState(tournament.date ?? '')
  const [timeRange, setTimeRange] = useState(tournament.time_range ?? '')
  const [scheduleStart, setScheduleStart] = useState(
    tournament.schedule_start ?? '13:00'
  )
  const [scheduleInterval, setScheduleInterval] = useState(
    tournament.schedule_interval ?? 14
  )

  // Teams (sorted by position)
  const [teams, setTeams] = useState<Team[]>(
    [...initialTeams].sort((a, b) => a.position - b.position)
  )

  // Rules
  const [rules, setRules] = useState(tournament.rules ?? '')

  // Scores
  const [scores, setScores] = useState<ScoresMap>(initialScores)

  // Save status
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')

  // Ref for debounce timer
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Current tournament object (for document rendering)
  const currentTournament: Tournament = {
    ...tournament,
    title,
    subtitle,
    location,
    date,
    time_range: timeRange,
    schedule_start: scheduleStart,
    schedule_interval: scheduleInterval,
    rules,
  }

  // ---------- Auto-save ----------
  const scheduleSave = useCallback(
    (
      overrides?: Partial<{
        title: string
        subtitle: string
        location: string
        date: string
        timeRange: string
        scheduleStart: string
        scheduleInterval: number
        rules: string
        teams: Team[]
        scores: ScoresMap
      }>
    ) => {
      setSaveStatus('unsaved')
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        setSaveStatus('saving')

        const t = overrides?.title ?? title
        const sub = overrides?.subtitle ?? subtitle
        const loc = overrides?.location ?? location
        const d = overrides?.date ?? date
        const tr = overrides?.timeRange ?? timeRange
        const ss = overrides?.scheduleStart ?? scheduleStart
        const si = overrides?.scheduleInterval ?? scheduleInterval
        const ru = overrides?.rules ?? rules
        const sc = overrides?.scores ?? scores
        const tms = overrides?.teams ?? teams

        try {
          // Save tournament fields
          await supabase
            .from('tournaments')
            .update({
              title: t,
              subtitle: sub,
              location: loc,
              date: d,
              time_range: tr,
              schedule_start: ss,
              schedule_interval: si,
              rules: ru,
            })
            .eq('id', tournament.id)

          // Save scores — upsert all match_results (team_a_idx < team_b_idx always)
          const upserts: {
            tournament_id: string
            team_a_idx: number
            team_b_idx: number
            game_number: number
            score_a: number | null
            score_b: number | null
          }[] = []

          for (const [key, val] of Object.entries(sc)) {
            // key format: "min-max-game"
            const parts = key.split('-').map(Number)
            const [a, b, game] = parts
            upserts.push({
              tournament_id: tournament.id,
              team_a_idx: a,
              team_b_idx: b,
              game_number: game ?? 1,
              score_a: val.a,
              score_b: val.b,
            })
          }

          if (upserts.length > 0) {
            await supabase.from('match_results').upsert(upserts, {
              onConflict: 'tournament_id,team_a_idx,team_b_idx,game_number',
            })
          }

          // Save teams — split into real (upsert) and temp (insert)
          const realTeams = tms.filter((tm) => !tm.id.startsWith('temp-'))
          const tempTeams = tms.filter((tm) => tm.id.startsWith('temp-'))

          if (realTeams.length > 0) {
            await supabase.from('teams').upsert(
              realTeams.map((tm) => ({
                id: tm.id,
                tournament_id: tm.tournament_id,
                name: tm.name,
                position: tm.position,
              })),
              { onConflict: 'id' }
            )
          }

          if (tempTeams.length > 0) {
            const { data: insertedTeams } = await supabase
              .from('teams')
              .insert(
                tempTeams.map((tm) => ({
                  tournament_id: tm.tournament_id,
                  name: tm.name,
                  position: tm.position,
                }))
              )
              .select()

            // Replace temp IDs with real IDs in state
            if (insertedTeams && insertedTeams.length > 0) {
              setTeams((prev) => {
                const updated = [...prev]
                tempTeams.forEach((tempTeam, i) => {
                  const realTeam = (insertedTeams as Team[])[i]
                  if (realTeam) {
                    const idx = updated.findIndex((t) => t.id === tempTeam.id)
                    if (idx !== -1) updated[idx] = realTeam
                  }
                })
                return updated
              })
            }
          }

          setSaveStatus('saved')
        } catch {
          setSaveStatus('unsaved')
        }
      }, 800)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [title, subtitle, location, date, timeRange, scheduleStart, scheduleInterval, rules, scores, teams]
  )

  // ---------- Field change helpers ----------
  function handleTitleChange(val: string) {
    setTitle(val)
    scheduleSave({ title: val })
  }
  function handleSubtitleChange(val: string) {
    setSubtitle(val)
    scheduleSave({ subtitle: val })
  }
  function handleLocationChange(val: string) {
    setLocation(val)
    scheduleSave({ location: val })
  }
  function handleDateChange(val: string) {
    setDate(val)
    scheduleSave({ date: val })
  }
  function handleTimeRangeChange(val: string) {
    setTimeRange(val)
    scheduleSave({ timeRange: val })
  }
  function handleScheduleStartChange(val: string) {
    setScheduleStart(val)
    scheduleSave({ scheduleStart: val })
  }
  function handleScheduleIntervalChange(val: number) {
    setScheduleInterval(val)
    scheduleSave({ scheduleInterval: val })
  }
  function handleRulesChange(val: string) {
    setRules(val)
    scheduleSave({ rules: val })
  }

  // ---------- Score change ----------
  function handleScoreChange(i: number, j: number, value: string, game = 1) {
    const key = sKey(i, j, game)
    const parsed = value === '' ? null : parseInt(value, 10)
    const num = parsed === null || isNaN(parsed) ? null : parsed

    setScores((prev) => {
      const existing = prev[key] ?? { a: null, b: null }
      const updated: ScoresMap = {
        ...prev,
        [key]: {
          a: i < j ? num : existing.a,
          b: i < j ? existing.b : num,
        },
      }
      scheduleSave({ scores: updated })
      return updated
    })
  }

  // ---------- Team management ----------
  function handleTeamNameChange(idx: number, name: string) {
    setTeams((prev) => {
      const updated = prev.map((t) =>
        t.position === idx ? { ...t, name } : t
      )
      scheduleSave({ teams: updated })
      return updated
    })
  }

  function handleAddTeam() {
    const newPosition = teams.length
    const newTeam: Team = {
      id: `temp-${Date.now()}`,
      tournament_id: tournament.id,
      name: `チーム${newPosition + 1}`,
      position: newPosition,
      created_at: new Date().toISOString(),
    }
    const updated = [...teams, newTeam]
    setTeams(updated)
    setScores({})
    scheduleSave({ teams: updated, scores: {} })
  }

  async function handleRemoveTeam(idx: number) {
    if (teams.length <= 2) return
    const toRemove = teams[idx]

    // Delete from DB if real id
    if (!toRemove.id.startsWith('temp-')) {
      await supabase.from('teams').delete().eq('id', toRemove.id)
    }

    // Re-number positions
    const updated = teams
      .filter((_, i) => i !== idx)
      .map((t, i) => ({ ...t, position: i }))

    setTeams(updated)
    setScores({})
    scheduleSave({ teams: updated, scores: {} })
  }

  function handleResetScores() {
    if (!confirm('全スコアをリセットしますか？')) return
    setScores({})
    scheduleSave({ scores: {} })
  }

  // ---------- Save status badge ----------
  const statusLabel: Record<SaveStatus, string> = {
    saved: '保存済み',
    saving: '保存中...',
    unsaved: '未保存',
  }
  const statusColor: Record<SaveStatus, string> = {
    saved: 'text-green-400',
    saving: 'text-yellow-400',
    unsaved: 'text-orange-400',
  }

  // ---------- Sidebar content ----------
  const SidebarContent = (
    <div className="flex flex-col gap-5 p-4">
      {/* Event info */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          イベント情報
        </h3>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full bg-[#253347] border border-[#334155] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">サブタイトル</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => handleSubtitleChange(e.target.value)}
              className="w-full bg-[#253347] border border-[#334155] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">場所</label>
            <input
              type="text"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="w-full bg-[#253347] border border-[#334155] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
              placeholder="みなとフットサルコート"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">日付</label>
            <input
              type="date"
              value={toDateInputValue(date)}
              onChange={(e) => handleDateChange(toJaDate(e.target.value))}
              className="w-full bg-[#253347] border border-[#334155] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">時間帯</label>
            <div className="flex items-center gap-1">
              <input
                type="time"
                value={parseTimeRange(timeRange).start}
                onChange={(e) => handleTimeRangeChange(`${e.target.value}～${parseTimeRange(timeRange).end}`)}
                className="flex-1 min-w-0 bg-[#253347] border border-[#334155] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
              />
              <span className="text-gray-500 text-sm select-none">～</span>
              <input
                type="time"
                value={parseTimeRange(timeRange).end}
                onChange={(e) => handleTimeRangeChange(`${parseTimeRange(timeRange).start}～${e.target.value}`)}
                className="flex-1 min-w-0 bg-[#253347] border border-[#334155] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Schedule */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          スケジュール
        </h3>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">開始時刻</label>
            <input
              type="time"
              value={scheduleStart}
              onChange={(e) => handleScheduleStartChange(e.target.value)}
              className="w-full bg-[#253347] border border-[#334155] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">
              試合間隔（分）
            </label>
            <input
              type="number"
              value={scheduleInterval}
              min={5}
              max={60}
              onChange={(e) => handleScheduleIntervalChange(Number(e.target.value))}
              className="w-full bg-[#253347] border border-[#334155] text-white text-sm rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>
      </section>

      {/* Teams */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          チーム管理
        </h3>
        <div className="space-y-1.5">
          {teams.map((team, idx) => (
            <div key={team.id} className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 w-5 text-center flex-shrink-0">
                {idx + 1}
              </span>
              <input
                type="text"
                value={team.name}
                onChange={(e) => handleTeamNameChange(team.position, e.target.value)}
                className="flex-1 min-w-0 bg-[#253347] border border-[#334155] text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-blue-400"
              />
              {teams.length > 2 && (
                <button
                  onClick={() => handleRemoveTeam(idx)}
                  className="flex-shrink-0 text-gray-500 hover:text-red-400 text-lg leading-none w-5 text-center"
                  title="削除"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {teams.length < 8 && (
            <button
              onClick={handleAddTeam}
              className="mt-1 w-full text-xs text-blue-400 hover:text-blue-300 border border-dashed border-[#334155] hover:border-blue-400 rounded py-1.5 transition-colors"
            >
              ＋ チームを追加
            </button>
          )}
        </div>
      </section>

      {/* Rules (admin only) */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          大会概要
        </h3>
        <textarea
          value={rules}
          onChange={(e) => handleRulesChange(e.target.value)}
          readOnly={!canEditRules}
          rows={8}
          className="w-full bg-[#253347] border border-[#334155] text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-400 resize-y"
        />
        {!canEditRules && (
          <p className="text-xs text-gray-500 mt-1">管理者のみ編集可能</p>
        )}
      </section>

      {/* Actions */}
      <section className="space-y-2">
        <button
          onClick={handleResetScores}
          className="w-full text-sm text-orange-400 hover:text-orange-300 border border-[#334155] hover:border-orange-400 rounded py-2 transition-colors"
        >
          スコアをリセット
        </button>
        <button
          onClick={() => window.print()}
          className="w-full text-sm bg-white text-gray-800 hover:bg-gray-100 rounded py-2 font-medium transition-colors"
        >
          印刷
        </button>
      </section>
    </div>
  )

  // ---------- Document preview ----------
  const DocumentPreview = (
    <div className="overflow-auto flex-1">
      <div className="py-4 px-4">
        <TournamentDocument
          tournament={currentTournament}
          teams={teams}
          scores={scores}
          editable={true}
          onScoreChange={handleScoreChange}
        />
      </div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="no-print bg-[#0f172a] text-white flex items-center justify-between px-4 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/tournaments/${tournament.id}`}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← 表示画面
          </Link>
          <h1 className="text-sm font-semibold text-white truncate max-w-xs">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${statusColor[saveStatus]}`}>
            {statusLabel[saveStatus]}
          </span>
          <Link
            href="/tournaments"
            className="text-xs text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 px-3 py-1 rounded transition-colors"
          >
            一覧
          </Link>
        </div>
      </header>

      {/* Desktop layout (md+): sidebar + document */}
      <div className="no-print hidden md:flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[270px] flex-shrink-0 bg-[#1a2535] text-white overflow-y-auto">
          {SidebarContent}
        </aside>

        {/* Document area */}
        <div className="flex-1 overflow-auto bg-gray-200">
          {DocumentPreview}
        </div>
      </div>

      {/* Mobile layout: Tabs */}
      <div className="no-print md:hidden flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="settings" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="rounded-none border-b border-gray-200 bg-white justify-start px-2 h-10 flex-shrink-0">
            <TabsTrigger value="settings" className="text-sm">
              設定
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-sm">
              プレビュー
            </TabsTrigger>
            <TabsTrigger value="print" className="text-sm">
              印刷
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="settings"
            className="flex-1 overflow-y-auto bg-[#1a2535] m-0 rounded-none"
          >
            {SidebarContent}
          </TabsContent>

          <TabsContent
            value="preview"
            className="flex-1 overflow-auto bg-gray-200 m-0 rounded-none"
          >
            {DocumentPreview}
          </TabsContent>

          <TabsContent
            value="print"
            className="flex-1 overflow-y-auto bg-white m-0 rounded-none"
          >
            <div className="p-6 space-y-4 max-w-md mx-auto">
              <h2 className="font-semibold text-gray-800">印刷</h2>
              <p className="text-sm text-gray-600">
                下のボタンを押して、ブラウザの印刷ダイアログを開いてください。
                A4サイズで印刷することを推奨します。
              </p>
              <button
                onClick={() => window.print()}
                className="w-full bg-gray-900 hover:bg-black text-white font-medium px-4 py-3 rounded-lg transition-colors"
              >
                印刷する
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Print-only: show document */}
      <div className="print-only hidden print:block">
        <TournamentDocument
          tournament={currentTournament}
          teams={teams}
          scores={scores}
          editable={false}
        />
      </div>
    </div>
  )
}
