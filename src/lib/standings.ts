import type { ScoresMap, Standing, MatchResult } from '@/types'

/** Normalize match key: "lowerIdx-higherIdx-gameNumber" */
export function sKey(i: number, j: number, game = 1): string {
  return `${Math.min(i, j)}-${Math.max(i, j)}-${game}`
}

/** Get team i's score in match vs team j (game 1 by default) */
export function getScore(scores: ScoresMap, i: number, j: number, game = 1): string {
  const s = scores[sKey(i, j, game)]
  if (!s) return ''
  const v = i < j ? s.a : s.b
  return v !== null && v !== undefined ? String(v) : ''
}

/**
 * Calculate standings for all teams.
 * For n=3 (double round-robin), counts both game=1 and game=2.
 * Only counts matches where BOTH scores are non-null.
 * Sort: pts desc → goal_diff desc → scored desc → original idx asc
 */
export function calcStandings(n: number, scores: ScoresMap): Standing[] {
  const st: Standing[] = Array.from({ length: n }, (_, i) => ({
    idx: i, w: 0, d: 0, l: 0, scored: 0, conceded: 0, pts: 0,
  }))

  const gamesPerPair = n === 3 ? [1, 2] : [1]

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (const g of gamesPerPair) {
        const s = scores[sKey(i, j, g)]
        if (!s || s.a === null || s.b === null) continue
        const si = s.a, sj = s.b
        st[i].scored += si; st[i].conceded += sj
        st[j].scored += sj; st[j].conceded += si
        if (si > sj) { st[i].w++; st[i].pts += 3; st[j].l++ }
        else if (si < sj) { st[j].w++; st[j].pts += 3; st[i].l++ }
        else { st[i].d++; st[i].pts++; st[j].d++; st[j].pts++ }
      }
    }
  }

  return st.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    const da = a.scored - a.conceded, db = b.scored - b.conceded
    if (db !== da) return db - da
    if (b.scored !== a.scored) return b.scored - a.scored
    return a.idx - b.idx
  })
}

/** Convert MatchResult rows to ScoresMap */
export function resultsToScoresMap(results: MatchResult[]): ScoresMap {
  const map: ScoresMap = {}
  for (const r of results) {
    const game = r.game_number ?? 1
    map[`${Math.min(r.team_a_idx, r.team_b_idx)}-${Math.max(r.team_a_idx, r.team_b_idx)}-${game}`] = {
      a: r.score_a,
      b: r.score_b,
    }
  }
  return map
}
