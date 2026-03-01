import type { ScheduledMatch } from '@/types'

/**
 * Generates a round-robin schedule using the circle method.
 * Team 0 is fixed; teams 1..N-1 rotate left each round.
 * For odd N, a bye slot (-1) is appended and filtered out.
 * Produces C(N,2) matches ordered to minimize consecutive play.
 *
 * Special case: n=3 plays a double round-robin (2 full rounds = 6 matches).
 */
export function generateSchedule(n: number): ScheduledMatch[] {
  if (n < 2) return []

  const rounds = n === 3 ? 2 : 1
  const allMatches: ScheduledMatch[] = []
  let no = 1

  for (let round = 1; round <= rounds; round++) {
    const teams = Array.from({ length: n }, (_, i) => i)
    if (n % 2 !== 0) teams.push(-1) // bye slot
    const N = teams.length
    const fixed = teams[0]
    const rot = teams.slice(1)

    for (let r = 0; r < N - 1; r++) {
      const pairs: [number, number][] = [[fixed, rot[0]]]
      for (let i = 1; i < N / 2; i++) {
        pairs.push([rot[N - 1 - i], rot[i]])
      }
      for (const [a, b] of pairs) {
        if (a !== -1 && b !== -1) {
          allMatches.push({ no: no++, teamA: a, teamB: b, game: round })
        }
      }
      rot.push(rot.shift()!) // rotate left
    }
  }

  return allMatches
}

/** Add minutes to "HH:MM" string */
export function addMins(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
