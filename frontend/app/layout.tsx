import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kairos Dashboard',
  description: 'AI-Powered Drone Surveillance for Rapid Crisis Response',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
          crossOrigin="" 
        />
        <Script 
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" 
          crossOrigin="" 
          strategy="beforeInteractive" 
        />
        <Script 
          src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js" 
          strategy="beforeInteractive" 
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
