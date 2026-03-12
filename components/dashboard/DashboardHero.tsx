import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { KPIBlock } from "@/components/ui/KPIBlock"

type Session = {
  id: string
  scheduled_time: string
  clients?: { full_name?: string } | null
}

interface DashboardHeroProps {
  currentTime: string
  nextSession: Session | null
  revenueThisWeek: number
  upcomingCount: number
  pendingCount: number
  unseenMessagesCount: number
}

export function DashboardHero({
  currentTime,
  nextSession,
  revenueThisWeek,
  upcomingCount,
  pendingCount,
  unseenMessagesCount,
}: DashboardHeroProps) {
  return (
    <Card variant="raised">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--cp-text-muted)]">
              Next session
            </p>
            {nextSession ? (
              <div className="mt-1">
                <p className="text-lg font-semibold text-[var(--cp-text-primary)]">
                  {nextSession.clients?.full_name ?? "Client"}
                </p>
                <p className="text-sm text-[var(--cp-text-muted)]">
                  {format(new Date(nextSession.scheduled_time), "EEE, MMM d · h:mm a")}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-sm text-[var(--cp-text-muted)]">
                No upcoming sessions. Pick a time with a client to fill your week.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-3">
              <Button size="sm" asChild>
                <Link href="/coach/schedule">Open Schedule</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/coach/messages">Open Messages</Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:w-64">
            <p className="text-xs text-[var(--cp-text-muted)]">
              {currentTime}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <KPIBlock
                label="This week"
                value={`$${revenueThisWeek.toLocaleString()}`}
              />
              <KPIBlock
                label="Upcoming"
                value={upcomingCount}
              />
              <KPIBlock
                label="Pending"
                value={pendingCount}
              />
              <KPIBlock
                label="Unread"
                value={unseenMessagesCount}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

