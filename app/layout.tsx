import { Jost, Source_Serif_4, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const jost = Jost({ subsets: ['latin'], variable: '--font-jost', weight: ['500', '600', '700'] })
const sourceSerif = Source_Serif_4({ subsets: ['latin'], variable: '--font-source-serif' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-plex-mono', weight: ['400', '500'] })

export const metadata = {
  title: 'EnGedi Africa',
  description: 'The construction marketplace for Africa',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jost.variable} ${sourceSerif.variable} ${plexMono.variable}`}>
      <body>
        {children}
      </body>
    </html>
  )
}