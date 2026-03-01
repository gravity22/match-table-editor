import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '対戦表エディター',
  description: 'フットサル大会の対戦表をブラウザで作成・編集',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="antialiased bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
