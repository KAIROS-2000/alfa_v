import { serverApi } from '@/lib/server-api'
import { AdminWorkspace } from '@/components/admin-workspace'
import { SiteHeader } from '@/components/site-header'
import { ModuleItem, UserItem } from '@/types'

interface OverviewData {
  stats: {
    users: number
    students: number
    teachers: number
    modules: number
    lessons: number
  }
}

export default async function SuperadminPage() {
  const [overview, modules, users] = await Promise.all([
    serverApi<OverviewData>('/admin/overview').catch(() => null),
    serverApi<{ modules: ModuleItem[] }>('/admin/modules').catch(() => null),
    serverApi<{ users: UserItem[] }>('/admin/users').catch(() => null),
  ])

  return (
    <main>
      <SiteHeader />
      <div className="page-shell mx-auto max-w-7xl space-y-6">
        <section className="codequest-card superadmin-hero p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-rose-600">Суперадмин</p>
          <h1 className="page-title mt-2 text-slate-900">Управление администраторами и платформой</h1>
          <p className="page-lead mt-4 max-w-3xl text-slate-600">Суперадминистратор управляет администраторами платформы: создаёт аккаунты, блокирует, разблокирует и удаляет их при необходимости.</p>
        </section>
        <AdminWorkspace superMode initialData={{ overview, modules: modules?.modules, users: users?.users }} />
      </div>
    </main>
  )
}
