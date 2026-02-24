import './globals.css'

export const metadata = {
  title: 'Retail Forecasting Starter',
  description: 'CSV ingestion and forecasting workflow starter.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
