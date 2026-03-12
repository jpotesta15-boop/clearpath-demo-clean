import * as React from "react"
import { KPIBlock } from "@/components/ui/KPIBlock"

interface DashboardKPIStripProps {
  revenue: number
  revenueThisWeek: number
  totalClients: number
}

export function DashboardKPIStrip({
  revenue,
  revenueThisWeek,
  totalClients,
}: DashboardKPIStripProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <KPIBlock label="Total revenue" value={`$${Math.round(revenue).toLocaleString()}`} />
      <KPIBlock label="This week" value={`$${revenueThisWeek.toLocaleString()}`} />
      <KPIBlock label="Clients" value={totalClients} />
    </div>
  )
}

