'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { bulkUpdateClientNamesAction, bulkDeleteClientsAction } from './actions'

function getInitials(name: string | null | undefined): string {
  if (!name) return 'CP'
  const parts = name.trim().split(' ')
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : ''
  return (first + last).toUpperCase() || 'CP'
}

type Client = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  notes: string | null
}

export function ClientListWithActions({ clients }: { clients: Client[] }) {
  const router = useRouter()
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showSetNameModal, setShowSetNameModal] = useState(false)
  const [setNameValue, setSetNameValue] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllUnnamed = () => {
    const unnamed = clients.filter((c) => !c.full_name?.trim()).map((c) => c.id)
    setSelectedIds((prev) => new Set([...prev, ...unnamed]))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setSelectMode(false)
    setShowSetNameModal(false)
    setShowDeleteConfirm(false)
    setError(null)
  }

  const handleSetName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedIds.size === 0) return
    setLoading(true)
    setError(null)
    const result = await bulkUpdateClientNamesAction(Array.from(selectedIds), setNameValue)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    clearSelection()
    setSetNameValue('')
    router.refresh()
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setLoading(true)
    setError(null)
    const result = await bulkDeleteClientsAction(Array.from(selectedIds))
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    clearSelection()
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {selectMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] p-3">
          <span className="text-sm text-[var(--cp-text-muted)]">
            {selectedIds.size} selected
          </span>
          <Button size="sm" variant="outline" onClick={() => setShowSetNameModal(true)} disabled={selectedIds.size === 0}>
            Set name
          </Button>
          <Button size="sm" variant="outline" className="text-[var(--cp-accent-danger)] border-[var(--cp-accent-danger)]/50" onClick={() => setShowDeleteConfirm(true)} disabled={selectedIds.size === 0}>
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={selectAllUnnamed}>
            Select all unnamed
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            Cancel
          </Button>
        </div>
      )}

      {!selectMode && (
        <Button variant="outline" size="sm" onClick={() => setSelectMode(true)}>
          Select
        </Button>
      )}

      {error && (
        <p className="text-sm text-[var(--cp-accent-danger)]">{error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <div key={client.id} className="h-full">
            {selectMode ? (
              <Card
                variant="raised"
                className={`h-full cursor-pointer transition-colors ${selectedIds.has(client.id) ? 'ring-2 ring-[var(--cp-accent-primary)]' : ''}`}
                onClick={() => toggleSelect(client.id)}
              >
                <CardHeader className="flex flex-row items-center space-y-0 gap-3 pb-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(client.id)}
                    onChange={() => toggleSelect(client.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-[var(--cp-border-subtle)]"
                  />
                  <div className="h-10 w-10 rounded-full bg-[var(--cp-accent-primary-soft)] flex items-center justify-center text-xs font-semibold text-[var(--cp-accent-primary)]">
                    {getInitials(client.full_name)}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">
                      {client.full_name || 'Unnamed client'}
                    </CardTitle>
                    {client.email && (
                      <p className="text-xs text-[var(--cp-text-subtle)] truncate">
                        {client.email}
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {client.phone && (
                    <p className="text-xs text-[var(--cp-text-muted)]">
                      <span className="font-medium text-[var(--cp-text-primary)]">Phone:</span> {client.phone}
                    </p>
                  )}
                  {client.notes && (
                    <p className="mt-1 text-xs text-[var(--cp-text-muted)] line-clamp-3">
                      {client.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Link href={`/coach/clients/${client.id}`}>
                <Card variant="raised" interactive className="h-full">
                  <CardHeader className="flex flex-row items-center space-y-0 gap-3 pb-4">
                    <div className="h-10 w-10 rounded-full bg-[var(--cp-accent-primary-soft)] flex items-center justify-center text-xs font-semibold text-[var(--cp-accent-primary)]">
                      {getInitials(client.full_name)}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">
                        {client.full_name || 'Unnamed client'}
                      </CardTitle>
                      {client.email && (
                        <p className="text-xs text-[var(--cp-text-subtle)] truncate">
                          {client.email}
                        </p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {client.phone && (
                      <p className="text-xs text-[var(--cp-text-muted)]">
                        <span className="font-medium text-[var(--cp-text-primary)]">Phone:</span> {client.phone}
                      </p>
                    )}
                    {client.notes && (
                      <p className="mt-1 text-xs text-[var(--cp-text-muted)] line-clamp-3">
                        {client.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={showSetNameModal}
        onClose={() => !loading && setShowSetNameModal(false)}
        preventClose={!!loading}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-[var(--cp-text-primary)] mb-2">Set display name</h3>
          <p className="text-sm text-[var(--cp-text-muted)] mb-3">
            This name will be applied to all {selectedIds.size} selected client(s).
          </p>
          <form onSubmit={handleSetName} className="space-y-3">
            <Input
              value={setNameValue}
              onChange={(e) => setSetNameValue(e.target.value)}
              placeholder="Display name"
              className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowSetNameModal(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal
        open={showDeleteConfirm}
        onClose={() => !loading && setShowDeleteConfirm(false)}
        preventClose={!!loading}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-[var(--cp-text-primary)] mb-2">Delete {selectedIds.size} client(s)?</h3>
          <p className="text-sm text-[var(--cp-text-muted)] mb-4">
            This will permanently remove these clients and their assignments. This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              className="bg-[var(--cp-accent-danger)] text-white hover:opacity-90"
              onClick={handleBulkDelete}
              disabled={loading}
            >
              {loading ? 'Deleting…' : 'Yes, delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
