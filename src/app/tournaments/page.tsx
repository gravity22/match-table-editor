import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canCreate, canAdmin } from '@/lib/permissions'
import type { Tournament, UserRole } from '@/types'
import LogoutButton from './LogoutButton'

export default async function TournamentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*, venues(name)')
    .order('created_at', { ascending: false })

  const { data: userRole } = user
    ? await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .single()
    : { data: null }

  const role = userRole as UserRole | null
  const list = (tournaments ?? []) as Tournament[]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">対戦表エディタ</h1>
          <div className="flex items-center gap-3">
            {canAdmin(role) && (
              <Link
                href="/admin"
                className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-2"
              >
                管理者パネル
              </Link>
            )}
            <span className="text-sm text-gray-500">{(user.email ?? '').replace(/@local$/, '')}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">対戦表一覧</h2>
          {canCreate(role) && (
            <Link
              href="/tournaments/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <span>＋</span>
              新しい対戦表を作成
            </Link>
          )}
        </div>

        {list.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-lg">まだ対戦表がありません</p>
            {canCreate(role) && (
              <p className="mt-2 text-sm">
                右上の「新しい対戦表を作成」から始めましょう
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => {
              const venueName =
                t.venues && typeof t.venues === 'object' && 'name' in t.venues
                  ? (t.venues as { name: string }).name
                  : null
              return (
                <div
                  key={t.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col"
                >
                  <div className="flex-1">
                    {venueName && (
                      <span className="inline-block text-xs text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full mb-2">
                        {venueName}
                      </span>
                    )}
                    <h3 className="font-bold text-gray-900 text-base leading-snug mb-1">
                      {t.title}
                    </h3>
                    {t.subtitle && (
                      <p className="text-sm text-gray-600 mb-2">{t.subtitle}</p>
                    )}
                    <div className="text-xs text-gray-400 space-y-0.5">
                      {t.date && <div>{t.date}</div>}
                      {t.time_range && <div>{t.time_range}</div>}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                    <Link
                      href={`/tournaments/${t.id}`}
                      className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                    >
                      表示
                    </Link>
                    {canAdmin(role) && (
                      <Link
                        href={`/tournaments/${t.id}/edit`}
                        className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        編集
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
