'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { format } from 'date-fns'

type MonthDatum = { monthLabel: string; revenue: number; monthStart: string }
type ClientStat = {
  clientId: string
  clientName: string
  sessionsAttended: number
  lastSessionDate: string | null
  totalSpent: number
}

export function AnalyticsContent({
  monthlyRevenue,
  totalRevenue,
  clientStats,
}: {
  monthlyRevenue: MonthDatum[]
  totalRevenue: number
  clientStats: ClientStat[]
}) {
  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
  const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-2 sm:px-4">
      <motion.div initial="hidden" animate="show" variants={container}>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Analytics</h1>
          <p className="text-sm text-[var(--cp-text-muted)]">
            Revenue trends and client activity.
          </p>
        </div>

        <motion.div variants={item} className="mt-6">
          <Card className="border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)]">
            <CardHeader>
              <CardTitle className="text-[var(--cp-text-primary)]">Monthly revenue</CardTitle>
              <p className="text-sm font-normal text-[var(--cp-text-muted)]">
                Total: ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--cp-border-subtle)" />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fill: 'var(--cp-text-muted)', fontSize: 12 }}
                      stroke="var(--cp-border-subtle)"
                    />
                    <YAxis
                      tick={{ fill: 'var(--cp-text-muted)', fontSize: 12 }}
                      stroke="var(--cp-border-subtle)"
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--cp-bg-elevated)',
                        border: '1px solid var(--cp-border-subtle)',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'var(--cp-text-muted)' }}
                      formatter={(value: number | undefined) => [value != null ? `$${value.toFixed(2)}` : '—', 'Revenue']}
                      labelFormatter={(label) => label}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="var(--cp-accent-primary)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="mt-6">
          <Card className="border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)]">
            <CardHeader>
              <CardTitle className="text-[var(--cp-text-primary)]">Client activity</CardTitle>
              <p className="text-sm font-normal text-[var(--cp-text-muted)]">
                Sessions attended, last visit, and total spent per client.
              </p>
            </CardHeader>
            <CardContent>
              {clientStats.length === 0 ? (
                <EmptyState
                  title="No client data yet"
                  description="Data will appear as you add clients and sessions."
                  className="py-6"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--cp-border-subtle)]">
                        <th className="text-left py-2 font-medium text-[var(--cp-text-primary)]">Client</th>
                        <th className="text-right py-2 font-medium text-[var(--cp-text-primary)]">Sessions</th>
                        <th className="text-right py-2 font-medium text-[var(--cp-text-primary)]">Last session</th>
                        <th className="text-right py-2 font-medium text-[var(--cp-text-primary)]">Total spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientStats.map((row) => (
                        <tr
                          key={row.clientId}
                          className="border-b border-[var(--cp-border-subtle)] last:border-0"
                        >
                          <td className="py-2">
                            <Link
                              href={`/coach/clients/${row.clientId}`}
                              className="font-medium text-[var(--cp-accent-primary)] hover:underline"
                            >
                              {row.clientName}
                            </Link>
                          </td>
                          <td className="text-right py-2 text-[var(--cp-text-primary)]">
                            {row.sessionsAttended}
                          </td>
                          <td className="text-right py-2 text-[var(--cp-text-muted)]">
                            {row.lastSessionDate
                              ? format(new Date(row.lastSessionDate), 'MMM d, yyyy')
                              : '—'}
                          </td>
                          <td className="text-right py-2 text-[var(--cp-text-primary)]">
                            ${row.totalSpent.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
