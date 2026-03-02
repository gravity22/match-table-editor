'use client'

import { generateSchedule, addMins } from '@/lib/schedule'
import { calcStandings, sKey } from '@/lib/standings'
import type { Tournament, Team, ScoresMap } from '@/types'

const GAME_3RD_PLACE = 91
const GAME_FINAL = 92

interface Props {
  tournament: Tournament
  teams: Team[]
  scores: ScoresMap
  editable?: boolean
  onScoreChange?: (i: number, j: number, value: string, game?: number) => void
}

export default function TournamentDocument({
  tournament, teams, scores, editable = false, onScoreChange,
}: Props) {
  const n = teams.length
  const sorted = [...teams].sort((a, b) => a.position - b.position)
  const matches = generateSchedule(n)
  const standings = calcStandings(n, scores)
  const rankOf: Record<number, number> = {}
  standings.forEach((s, r) => { rankOf[s.idx] = r + 1 })

  // A4 landscape: wider left column, so allow wider match/sum cols
  const matchColW = Math.max(75, Math.min(110, Math.floor(240 / n)))
  const sumColW   = n > 5 ? 28 : 33

  /** Return both teams' scores for cell (row=i, col=j, game) as strings */
  function getScorePair(i: number, j: number, game = 1): { si: string; sj: string } {
    const s = scores[sKey(i, j, game)]
    if (!s) return { si: '', sj: '' }
    const si = i < j ? s.a : s.b
    const sj = i < j ? s.b : s.a
    return {
      si: si !== null && si !== undefined ? String(si) : '',
      sj: sj !== null && sj !== undefined ? String(sj) : '',
    }
  }

  function scoreMark(si: string, sj: string): string {
    if (si === '' || sj === '') return ''
    return parseInt(si) > parseInt(sj) ? '○' : parseInt(si) < parseInt(sj) ? '×' : '△'
  }

  const allMatchesPlayed = matches.every(m => {
    const { si, sj } = getScorePair(m.teamA, m.teamB, m.game)
    return si !== '' && sj !== ''
  })

  const lastIdx  = matches.length
  const t1 = addMins(tournament.schedule_start, lastIdx * tournament.schedule_interval)
  const t2 = addMins(t1, tournament.schedule_interval)
  const t3 = addMins(t2, tournament.schedule_interval)

  // Playoff team indices (derived from standings)
  const place1 = standings[0]?.idx ?? 0
  const place2 = standings[1]?.idx ?? 1
  const place3 = standings[2]?.idx ?? 2
  const place4 = standings[3]?.idx ?? 3

  const inputCls = 'w-[22px] border border-gray-300 rounded text-center text-[8pt] bg-white focus:outline focus:outline-2 focus:outline-blue-400 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

  return (
    // A4 landscape: 297mm × 210mm
    <div className="tournament-document bg-white font-sans text-[10pt] leading-snug"
         style={{ width: '297mm', minHeight: '210mm', padding: '6mm 13mm 6mm', margin: '0 auto' }}>

      {/* Header */}
      <div className="flex justify-between items-end mb-1.5 pb-1 border-b border-gray-400">
        <div>
          <div className="text-[13pt] font-bold">{tournament.title}</div>
          <div className="text-[10pt] font-bold">{tournament.subtitle}</div>
        </div>
        <div className="text-[9pt] whitespace-nowrap pl-2 text-right">
          {tournament.location && <div>{tournament.location}</div>}
          <div>{tournament.date}　{tournament.time_range}</div>
        </div>
      </div>

      {/* Main: 2-column layout for landscape */}
      <div className="flex gap-5 items-start">

        {/* Left column: Round Robin Table */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[9.5pt] mb-1">{n === 3 ? '■リーグ戦' : '■予選リーグ'}</div>
          <table className="border-collapse w-full text-[8pt]"
                 style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 80 }} />
              {sorted.map((_, j) => <col key={j} style={{ width: matchColW }} />)}
              {[0,1,2,3].map(k => <col key={k} style={{ width: sumColW }} />)}
              <col style={{ width: 28 }} />
            </colgroup>
            <thead>
              <tr>
                <th className="border border-gray-700 p-0.5" />
                {sorted.map((t, j) => (
                  <th key={j} className="border border-gray-700 p-0.5 text-[7pt] break-all leading-tight">{t.name}</th>
                ))}
                <th className="border border-gray-700 p-0.5">得点</th>
                <th className="border border-gray-700 p-0.5">失点</th>
                <th className="border border-gray-700 p-0.5">得失</th>
                <th className="border border-gray-700 p-0.5">勝点</th>
                <th className="border border-gray-700 p-0.5">順位</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((rowTeam, i) => {
                const s = standings.find(x => x.idx === i)
                const played = s ? s.w + s.d + s.l : 0
                const diff   = s ? s.scored - s.conceded : 0
                const diffStr = diff >= 0 ? `+${diff}` : String(diff)
                return (
                  <tr key={i} style={n === 3 ? { height: '44px' } : undefined}>
                    <th className="border border-gray-700 p-0.5 text-left text-[8pt] font-bold break-all">
                      {rowTeam.name}
                    </th>
                    {sorted.map((_, j) => {
                      if (i === j) return (
                        <td key={j} className="border border-gray-700 p-0 relative overflow-hidden bg-gray-100">
                          <span className="absolute inset-0"
                                style={{ background: 'linear-gradient(to bottom right, transparent calc(50% - 0.6px), #666 calc(50% - 0.6px), #666 calc(50% + 0.6px), transparent calc(50% + 0.6px))' }} />
                        </td>
                      )
                      // For n=3 (double round-robin), show 2 game results per cell
                      if (n === 3) {
                        const { si: si1, sj: sj1 } = getScorePair(i, j, 1)
                        const { si: si2, sj: sj2 } = getScorePair(i, j, 2)
                        return (
                          <td key={j} className="border border-gray-700 p-0">
                            <div className="flex flex-col items-center leading-none py-0.5 gap-0.5">
                              <div className="flex flex-col items-center leading-none">
                                <span className="text-[6pt] leading-none">{scoreMark(si1, sj1)}</span>
                                <span className="text-[8pt] leading-none">
                                  {si1 !== '' && sj1 !== '' ? `${si1} - ${sj1}` : ''}
                                </span>
                              </div>
                              <div className="w-full border-t border-gray-300" />
                              <div className="flex flex-col items-center leading-none">
                                <span className="text-[6pt] leading-none">{scoreMark(si2, sj2)}</span>
                                <span className="text-[8pt] leading-none">
                                  {si2 !== '' && sj2 !== '' ? `${si2} - ${sj2}` : ''}
                                </span>
                              </div>
                            </div>
                          </td>
                        )
                      }
                      const { si, sj } = getScorePair(i, j, 1)
                      const hasScore = si !== '' && sj !== ''
                      return (
                        <td key={j} className="border border-gray-700 p-0">
                          <div className="flex flex-col items-center leading-none py-0.5">
                            <span className="text-[6pt] leading-none">{scoreMark(si, sj)}</span>
                            <span className="text-[8pt] leading-none">
                              {hasScore ? `${si} - ${sj}` : ''}
                            </span>
                          </div>
                        </td>
                      )
                    })}
                    <td className="border border-gray-700 p-0.5 text-center">{played > 0 ? s!.scored : ''}</td>
                    <td className="border border-gray-700 p-0.5 text-center">{played > 0 ? s!.conceded : ''}</td>
                    <td className="border border-gray-700 p-0.5 text-center">{played > 0 ? diffStr : ''}</td>
                    <td className="border border-gray-700 p-0.5 text-center">{played > 0 ? s!.pts : ''}</td>
                    <td className="border border-gray-700 p-0.5 text-center">{played > 0 ? rankOf[i] : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Footer below round-robin */}
          <div className="mt-2 text-[7.5pt] leading-[1.65]">
            <div>○勝ち点が並んだ場合の順位の確定方法</div>
            <div>　①得失点→②総得点→③直接対決の結果→④ジャンケン(またはコイントス）</div>
          </div>

          {/* Rules */}
          <div className="mt-2 text-[8pt] leading-[1.65]">
            <div className="font-bold text-[9.5pt] mb-1">■大会概要</div>
            {n >= 4 && <div>○決勝と3位決定戦が同点の場合は、予選リーグの順位が優先されます。（PK戦は行いません）</div>}
            <div>○スムーズな試合進行、プレー時間を確保するために、試合前の整列は行いません。</div>
            {(tournament.rules ?? '').split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>

        {/* Right column: Timetable */}
        <div className="flex-shrink-0 flex flex-col gap-3" style={{ width: '90mm' }}>
          {/* Timetable */}
          <div>
            <div className="font-bold text-[9.5pt] mb-1">■タイムテーブル</div>
            <table className="border-collapse text-[8.5pt] whitespace-nowrap w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-700 px-1.5 py-0.5 w-7">NO</th>
                  <th className="border border-gray-700 px-1.5 py-0.5 w-10">時間</th>
                  <th className="border border-gray-700 px-1.5 py-0.5">対戦カード</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m, idx) => {
                  const t = addMins(tournament.schedule_start, idx * tournament.schedule_interval)
                  const { si, sj } = getScorePair(m.teamA, m.teamB, m.game)
                  return (
                    <tr key={m.no}>
                      <td className="border border-gray-700 px-1.5 py-0.5 text-center">{m.no}</td>
                      <td className="border border-gray-700 px-1.5 py-0.5 text-center">{t}</td>
                      <td className="border border-gray-700 px-1.5 py-0.5">
                        {editable ? (
                          <div className="flex items-center gap-1">
                            <span className="flex-1">{sorted[m.teamA]?.name}</span>
                            <input type="number" min={0} max={99}
                              defaultValue={si}
                              onChange={e => onScoreChange?.(m.teamA, m.teamB, e.target.value, m.game)}
                              className={inputCls}
                            />
                            <span className="text-gray-400 select-none shrink-0">-</span>
                            <input type="number" min={0} max={99}
                              defaultValue={sj}
                              onChange={e => onScoreChange?.(m.teamB, m.teamA, e.target.value, m.game)}
                              className={inputCls}
                            />
                            <span className="flex-1 text-right">{sorted[m.teamB]?.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span className="flex-1">{sorted[m.teamA]?.name}</span>
                            <span className="px-1.5 shrink-0 text-gray-500">
                              {si !== '' && sj !== '' ? `${si} - ${sj}` : 'vs'}
                            </span>
                            <span className="flex-1 text-right">{sorted[m.teamB]?.name}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {n >= 4 && (<>
                  <tr>
                    <td className="border border-gray-700 px-1.5 py-0.5 text-center">{lastIdx + 1}</td>
                    <td className="border border-gray-700 px-1.5 py-0.5 text-center">{t1}</td>
                    <td className="border border-gray-700 px-1.5 py-0.5 leading-tight whitespace-normal">
                      <div className="text-center">3位決定戦</div>
                      {editable ? (
                        <div className="flex items-center gap-1">
                          <span className="flex-1">{sorted[place3]?.name}</span>
                          <input type="number" min={0} max={99}
                            defaultValue={getScorePair(place3, place4, GAME_3RD_PLACE).si}
                            onChange={e => onScoreChange?.(place3, place4, e.target.value, GAME_3RD_PLACE)}
                            className={inputCls}
                          />
                          <span className="text-gray-400 select-none shrink-0">-</span>
                          <input type="number" min={0} max={99}
                            defaultValue={getScorePair(place3, place4, GAME_3RD_PLACE).sj}
                            onChange={e => onScoreChange?.(place4, place3, e.target.value, GAME_3RD_PLACE)}
                            className={inputCls}
                          />
                          <span className="flex-1 text-right">{sorted[place4]?.name}</span>
                        </div>
                      ) : allMatchesPlayed ? (
                        <div className="flex items-center">
                          <span className="flex-1">{sorted[place3]?.name}</span>
                          <span className="px-1.5 shrink-0 text-gray-500">
                            {(() => { const { si, sj } = getScorePair(place3, place4, GAME_3RD_PLACE); return si !== '' && sj !== '' ? `${si} - ${sj}` : 'vs' })()}
                          </span>
                          <span className="flex-1 text-right">{sorted[place4]?.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span className="flex-1">3位</span>
                          <span className="px-1.5 shrink-0 text-gray-500">vs</span>
                          <span className="flex-1 text-right">4位</span>
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-700 px-1.5 py-0.5 text-center">{lastIdx + 2}</td>
                    <td className="border border-gray-700 px-1.5 py-0.5 text-center">{t2}</td>
                    <td className="border border-gray-700 px-1.5 py-0.5 leading-tight whitespace-normal">
                      <div className="text-center">決勝</div>
                      {editable ? (
                        <div className="flex items-center gap-1">
                          <span className="flex-1">{sorted[place1]?.name}</span>
                          <input type="number" min={0} max={99}
                            defaultValue={getScorePair(place1, place2, GAME_FINAL).si}
                            onChange={e => onScoreChange?.(place1, place2, e.target.value, GAME_FINAL)}
                            className={inputCls}
                          />
                          <span className="text-gray-400 select-none shrink-0">-</span>
                          <input type="number" min={0} max={99}
                            defaultValue={getScorePair(place1, place2, GAME_FINAL).sj}
                            onChange={e => onScoreChange?.(place2, place1, e.target.value, GAME_FINAL)}
                            className={inputCls}
                          />
                          <span className="flex-1 text-right">{sorted[place2]?.name}</span>
                        </div>
                      ) : allMatchesPlayed ? (
                        <div className="flex items-center">
                          <span className="flex-1">{sorted[place1]?.name}</span>
                          <span className="px-1.5 shrink-0 text-gray-500">
                            {(() => { const { si, sj } = getScorePair(place1, place2, GAME_FINAL); return si !== '' && sj !== '' ? `${si} - ${sj}` : 'vs' })()}
                          </span>
                          <span className="flex-1 text-right">{sorted[place2]?.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span className="flex-1">1位</span>
                          <span className="px-1.5 shrink-0 text-gray-500">vs</span>
                          <span className="flex-1 text-right">2位</span>
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-700 px-1.5 py-0.5 text-center"></td>
                    <td className="border border-gray-700 px-1.5 py-0.5 text-center">{t3}</td>
                    <td className="border border-gray-700 px-1.5 py-0.5 text-center">ピッチ完全撤収</td>
                  </tr>
                </>)}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  )
}
