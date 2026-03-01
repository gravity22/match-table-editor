'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Venue } from '@/types'

interface Props {
  initialVenues: Venue[]
}

export default function AdminVenuesClient({ initialVenues }: Props) {
  const supabase = createClient()

  const [venues, setVenues] = useState<Venue[]>(initialVenues)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newVenueName, setNewVenueName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleAddVenue(e: React.FormEvent) {
    e.preventDefault()
    if (!newVenueName.trim()) return
    setAdding(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('venues')
      .insert({ name: newVenueName.trim() })
      .select()
      .single()

    if (err || !data) {
      setError(err?.message ?? '会場の追加に失敗しました')
    } else {
      setVenues((prev) => [...prev, data as Venue])
      setNewVenueName('')
      setShowAddForm(false)
    }
    setAdding(false)
  }

  function startEdit(venue: Venue) {
    setEditingId(venue.id)
    setEditName(venue.name)
  }

  async function handleSaveEdit(venueId: string) {
    if (!editName.trim()) return
    setError(null)

    const { error: err } = await supabase
      .from('venues')
      .update({ name: editName.trim() })
      .eq('id', venueId)

    if (err) {
      setError(err.message)
    } else {
      setVenues((prev) =>
        prev.map((v) => (v.id === venueId ? { ...v, name: editName.trim() } : v))
      )
      setEditingId(null)
    }
  }

  async function handleDeleteVenue(venueId: string) {
    if (!confirm('この会場を削除しますか？関連する対戦表の会場情報もクリアされます。')) return
    setError(null)

    const { error: err } = await supabase
      .from('venues')
      .delete()
      .eq('id', venueId)

    if (err) {
      setError(err.message)
    } else {
      setVenues((prev) => prev.filter((v) => v.id !== venueId))
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
        {venues.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            会場が登録されていません
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left font-semibold text-gray-600 px-4 py-3">
                  会場名
                </th>
                <th className="text-left font-semibold text-gray-600 px-4 py-3">
                  ID
                </th>
                <th className="text-left font-semibold text-gray-600 px-4 py-3">
                  登録日時
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {venues.map((venue) => (
                <tr key={venue.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {editingId === venue.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(venue.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          autoFocus
                          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button
                          onClick={() => handleSaveEdit(venue.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      venue.name
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    {venue.id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(venue.created_at).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {editingId !== venue.id && (
                        <>
                          <button
                            onClick={() => startEdit(venue)}
                            className="text-xs text-gray-500 hover:text-blue-600"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDeleteVenue(venue.id)}
                            className="text-xs text-gray-400 hover:text-red-600"
                          >
                            削除
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add venue form */}
      {showAddForm ? (
        <form onSubmit={handleAddVenue} className="flex items-center gap-2">
          <input
            type="text"
            value={newVenueName}
            onChange={(e) => setNewVenueName(e.target.value)}
            placeholder="会場名を入力"
            autoFocus
            required
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            disabled={adding}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {adding ? '追加中...' : '追加'}
          </button>
          <button
            type="button"
            onClick={() => { setShowAddForm(false); setNewVenueName('') }}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
          >
            キャンセル
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <span>＋</span>
          会場を追加
        </button>
      )}
    </div>
  )
}
