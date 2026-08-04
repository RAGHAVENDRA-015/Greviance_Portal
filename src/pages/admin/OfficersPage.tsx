import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Mail, Building2, Phone, Shield } from 'lucide-react'
import { adminApi } from '@/api'
import { Card, CardHeader } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { ROUTES } from '@/constants'
import { formatDate } from '@/utils'

export default function OfficersPage() {
  const { data: officers = [], isLoading } = useQuery({
    queryKey: ['admin', 'officers'],
    queryFn: adminApi.officers,
  })

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: ROUTES.admin.dashboard },
          { label: 'Officers' },
        ]}
      />

      <div>
        <h1 className="font-display text-xl sm:text-2xl font-extrabold">Officers</h1>
        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-500">
          {isLoading
            ? 'Loading…'
            : `${officers.length} officer${officers.length === 1 ? '' : 's'} registered`}
        </p>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : officers.length === 0 ? (
        <EmptyState
          title="No officers yet"
          description="Promote users to the officer role from the Users page."
          icon={<Shield className="h-7 w-7" />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {officers.map((officer, i) => (
            <motion.div
              key={officer.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="h-full">
                <div className="flex items-start gap-3 sm:gap-4">
                  <Avatar name={officer.name} src={officer.profile_image} size="md" className="sm:h-12 sm:w-12" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h3 className="truncate font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {officer.name}
                      </h3>
                      <Badge
                        className={
                          officer.is_active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }
                      >
                        {officer.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{officer.email}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  {officer.department && (
                    <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Building2 className="h-4 w-4 text-indigo-500" />
                      {officer.department}
                    </p>
                  )}
                  {officer.phone && (
                    <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {officer.phone}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">Joined {formatDate(officer.created_at)}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && officers.length > 0 && (
        <Card hover={false}>
          <CardHeader title="Quick tip" subtitle="Assignment workflow" />
          <p className="text-sm text-slate-500">
            Assign officers to complaints from the Complaints list or an individual complaint detail
            page. Officers only see items in their department queue.
          </p>
        </Card>
      )}
    </div>
  )
}
