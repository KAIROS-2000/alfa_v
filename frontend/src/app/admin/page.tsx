import { serverApi } from '@/lib/server-api'
import { AdminWorkspace } from '@/components/admin-workspace'
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

export default async function AdminPage() {
  const [overview, modules] = await Promise.all([
    serverApi<OverviewData>('/admin/overview').catch(() => null),
    serverApi<{ modules: ModuleItem[] }>('/admin/modules').catch(() => null),
  ])

  return (
    <main className="brand-admin-shell">
      <div className="page-shell mx-auto w-full max-w-[96rem] space-y-6">
        <section className="codequest-card p-6 sm:p-8">
          <p className="brand-eyebrow">Admin panel</p>
          <h1 className="page-title mt-3 text-slate-900">Контент, публикация модулей и структура курса.</h1>
          <p className="page-lead mt-4 max-w-3xl text-slate-600">
            Админ остаётся в плотной рабочей среде, но визуально получает более ясные секции, единые статусы и понятный ритм между формами, редакторами и каталогом модулей.
          </p>
        </section>
        <AdminWorkspace initialData={{ overview, modules: modules?.modules }} />
      </div>
    </main>
  )
}
