'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={logout}
      className="text-sm text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 px-3 py-1 rounded-lg transition-colors"
    >
      ログアウト
    </button>
  )
}
