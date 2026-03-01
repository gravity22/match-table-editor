'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
    >
      印刷
    </button>
  )
}
