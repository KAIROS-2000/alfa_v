import { serverApi } from '@/lib/server-api'
import { DashboardView } from '@/components/dashboard-view'
import { SiteHeader } from '@/components/site-header'
import { DashboardData } from '@/types'

export default async function DashboardPage() {
  const initialData = await serverApi<DashboardData>('/dashboard').catch(() => null)

  return (
    <main>
      <SiteHeader />
      <div className="page-shell mx-auto max-w-7xl">
        <DashboardView initialData={initialData} />
      </div>
    </main>
  )
}
