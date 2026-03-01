import type { Tournament, UserRole } from '@/types'

/**
 * Returns true if the user can edit the given tournament.
 * - admin: always
 * - venue_manager: only if tournament.venue_id matches their venue_id
 */
export function canEdit(
  userRole: UserRole | null | undefined,
  tournament: Tournament | null | undefined
): boolean {
  if (!userRole || !tournament) return false
  if (userRole.role === 'admin') return true
  if (userRole.role === 'venue_manager') {
    return (
      userRole.venue_id !== null &&
      tournament.venue_id === userRole.venue_id
    )
  }
  return false
}

/** Returns true if the user can create new tournaments */
export function canCreate(userRole: UserRole | null | undefined): boolean {
  if (!userRole) return false
  return userRole.role === 'admin' || userRole.role === 'venue_manager'
}

/** Returns true if the user can manage users/venues (admin panel) */
export function canAdmin(userRole: UserRole | null | undefined): boolean {
  return userRole?.role === 'admin'
}
