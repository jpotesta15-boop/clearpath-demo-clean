import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { getBrandColors } from "@/lib/branding"
import { ThemeVariantProvider } from "@/components/providers/ThemeVariantProvider"
import { headers } from "next/headers"

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "ClearPath Coach OS",
  description: "Coaching management system",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const brandColors = await getBrandColors()
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){var m=localStorage.getItem("cp-theme-mode");document.documentElement.setAttribute("data-theme",m==="light"?"light":"dark");})();`,
          }}
        />
      </head>
      <body className={`${fontSans.variable} ${fontSans.className} min-h-screen bg-[var(--cp-bg-page)] text-[var(--cp-text-primary)] antialiased`}>
        <ThemeProvider
          brandPrimary={brandColors.primary}
          brandSecondary={brandColors.secondary}
        >
          <ThemeVariantProvider>
            {children}
          </ThemeVariantProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
