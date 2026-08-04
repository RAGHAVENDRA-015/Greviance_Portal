import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ShieldOff, UserCog } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersApi } from '@/api'
import { SearchBox } from '@/components/ui/SearchBox'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { usePagination, useDebouncedValue } from '@/hooks'
import { ROUTES } from '@/constants'
import { formatDate, getErrorMessage } from '@/utils'
import type { User, UserRole } from '@/types'

const ROLES: UserRole[] = ['citizen', 'officer', 'admin']

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search.toLowerCase().trim())
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: usersApi.list,
  })

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (!debounced) return true
        return (
          u.name.toLowerCase().includes(debounced) ||
          u.email.toLowerCase().includes(debounced) ||
          u.role.toLowerCase().includes(debounced) ||
          (u.department?.toLowerCase().includes(debounced) ?? false)
        )
      }),
    [users, debounced],
  )

  const { page, setPage, totalPages, items } = usePagination(filtered, 10)

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      usersApi.updateRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
      toast.success('Role updated')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to update role')),
  })

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => usersApi.deactivate(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
      toast.success('User deactivated')
      setDeactivateTarget(null)
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to deactivate user')),
  })

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: ROUTES.admin.dashboard },
          { label: 'Users' },
        ]}
      />

      <div>
        <h1 className="font-display text-xl sm:text-2xl font-extrabold">Users</h1>
        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-500">Manage roles and account status</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-3.5 sm:p-4"
      >
        <SearchBox
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Search by name, email, role…"
        />
      </motion.div>

      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : items.length === 0 ? (
        <EmptyState title="No users found" description="Try a different search." />
      ) : (
        <>
          <Card hover={false} className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Joined</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} src={u.profile_image} size="sm" />
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{u.name}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <UserCog className="h-4 w-4 text-slate-400" />
                          <select
                            value={u.role}
                            disabled={roleMutation.isPending || !u.is_active}
                            onChange={(e) =>
                              roleMutation.mutate({
                                userId: u.id,
                                role: e.target.value as UserRole,
                              })
                            }
                            className="h-9 rounded-lg border border-slate-200 bg-white/80 px-2 text-sm capitalize outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900/80"
                            aria-label={`Role for ${u.name}`}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            u.is_active
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={!u.is_active}
                          leftIcon={<ShieldOff className="h-3.5 w-3.5" />}
                          onClick={() => setDeactivateTarget(u)}
                        >
                          Deactivate
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      <Modal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate user"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeactivateTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deactivateMutation.isPending}
              onClick={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
            >
              Confirm deactivate
            </Button>
          </>
        }
      >
        {deactivateTarget && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Deactivate <span className="font-semibold">{deactivateTarget.name}</span> (
            {deactivateTarget.email})? They will no longer be able to sign in.
          </p>
        )}
      </Modal>
    </div>
  )
}
