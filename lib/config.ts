// Client configuration loader
// Reads client-config.json from the project root

export interface ClientConfig {
  clientName: string
  businessName: string
  brandColors: {
    primary: string
    secondary: string
  }
  logo?: string
  supabaseClientId: string
  features: {
    groupSessions: boolean
    videoLibrary: boolean
  }
}

let cachedConfig: ClientConfig | null = null

export async function getClientConfig(): Promise<ClientConfig> {
  if (cachedConfig) {
    return cachedConfig
  }

  // In server components, prefer client-config.json when present
  if (typeof window === 'undefined') {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      const configPath = path.join(process.cwd(), 'client-config.json')
      const configData = await fs.readFile(configPath, 'utf-8')
      const fileConfig = JSON.parse(configData) as Partial<ClientConfig>
      cachedConfig = normalizeConfig(fileConfig)
      return cachedConfig
    } catch (error) {
      // File missing or invalid → fall back to env-only config
      const envConfig = normalizeConfig({})
      cachedConfig = envConfig
      return envConfig
    }
  }

  // In client components, we only have env vars; normalize for consistency
  const envConfig = normalizeConfig({})
  cachedConfig = envConfig
  return envConfig
}

function normalizeConfig(partial: Partial<ClientConfig>): ClientConfig {
  const envClientName = process.env.NEXT_PUBLIC_CLIENT_NAME
  const envClientId = process.env.NEXT_PUBLIC_CLIENT_ID
  const envPrimary = process.env.NEXT_PUBLIC_BRAND_PRIMARY
  const envSecondary = process.env.NEXT_PUBLIC_BRAND_SECONDARY

  const clientName = envClientName || partial.clientName || 'ClearPath'
  const businessName = envClientName || partial.businessName || clientName
  const supabaseClientId = partial.supabaseClientId || envClientId || 'default'

  // Safety: ensure supabaseClientId and NEXT_PUBLIC_CLIENT_ID stay aligned in logs
  if (envClientId && partial.supabaseClientId && envClientId !== partial.supabaseClientId) {
    console.warn(
      '[client-config] Mismatch between NEXT_PUBLIC_CLIENT_ID and client-config.json.supabaseClientId. ' +
        `Using "${partial.supabaseClientId}" from client-config.json.`
    )
  }

  return {
    clientName,
    businessName,
    supabaseClientId,
    brandColors: {
      primary: envPrimary || partial.brandColors?.primary || '#0284c7',
      secondary: envSecondary || partial.brandColors?.secondary || '#0369a1',
    },
    logo: partial.logo,
    features: {
      groupSessions:
        typeof partial.features?.groupSessions === 'boolean' ? partial.features.groupSessions : true,
      videoLibrary:
        typeof partial.features?.videoLibrary === 'boolean' ? partial.features.videoLibrary : true,
    },
  }
}

export function getClientId(): string {
  return process.env.NEXT_PUBLIC_CLIENT_ID || 'default'
}

