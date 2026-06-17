import { Geist } from 'next/font/google'

const geist = Geist({ subsets: ['latin'] })

export const metadata = {
  title: 'EnGedi Africa',
  description: 'The construction marketplace for Africa',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: geist.style.fontFamily, background: '#F9F6F1' } as React.CSSProperties}>
        {children}
      </body>
    </html>
  )
}