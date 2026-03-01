import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { canAdmin } from '@/lib/permissions'
import type { Venue, UserRole } from '@/types'
import AdminVenuesClient from './AdminVenuesClient'

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user role
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const role = userRole as UserRole | null

  if (!canAdmin(role)) {
    redirect('/tournaments')
  }

  // Fetch venues
  const { data: venuesData } = await supabase
    .from('venues')
    .select('*')
    .order('name')

  // Fetch all user_roles
  const { data: userRolesData } = await supabase
    .from('user_roles')
    .select('*')
    .order('created_at')

  const venues = (venuesData ?? []) as Venue[]
  const userRoles = (userRolesData ?? []) as UserRole[]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/tournaments"
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← 一覧に戻る
          </Link>
          <h1 className="text-lg font-bold text-gray-800">管理者パネル</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Venues section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">会場管理</h2>
          </div>
          <AdminVenuesClient initialVenues={venues} />
        </section>

        {/* User Roles section */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">ユーザーロール</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {userRoles.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                ユーザーロールが登録されていません
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left font-semibold text-gray-600 px-4 py-3">
                      ユーザーID
                    </th>
                    <th className="text-left font-semibold text-gray-600 px-4 py-3">
                      ロール
                    </th>
                    <th className="text-left font-semibold text-gray-600 px-4 py-3">
                      会場ID
                    </th>
                    <th className="text-left font-semibold text-gray-600 px-4 py-3">
                      登録日時
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {userRoles.map((ur) => (
                    <tr key={ur.user_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 truncate max-w-[180px]">
                        {ur.user_id}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            ur.role === 'admin'
                              ? 'bg-red-100 text-red-700'
                              : ur.role === 'venue_manager'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {ur.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {ur.venue_id ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(ur.created_at).toLocaleString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            ユーザーロールの詳細な管理（メールアドレス確認・ロール変更）は
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline ml-1"
            >
              Supabase Studio
            </a>
            から行ってください。
          </p>
        </section>
      </main>
    </div>
  )
}
