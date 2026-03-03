import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { getBrandColors } from "@/lib/branding"
import { ThemeVariantProvider } from "@/components/providers/ThemeVariantProvider"

const inter = Inter({ subsets: ["latin"] })

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

  return (
    <html lang="en">
      <body className={inter.className}>
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
