import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { getBrandColors } from "@/lib/branding"
import { ThemeVariantProvider } from "@/components/providers/ThemeVariantProvider"

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

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var m=localStorage.getItem("cp-theme-mode");if(m==="light")document.documentElement.setAttribute("data-theme","light");else if(m==="dark")document.documentElement.setAttribute("data-theme","dark");else if(m==="system"){var d=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",d);}})();`,
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
