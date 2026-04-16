import { AdminWorkspace } from '@/components/admin-workspace'
import { serverApi } from '@/lib/server-api'
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
		<main className='brand-admin-shell'>
			<div className='page-shell mx-auto w-full max-w-[96rem] space-y-6'>
				<AdminWorkspace
					superMode
					initialData={{
						overview,
						modules: modules?.modules,
						users: users?.users,
					}}
				/>
			</div>
		</main>
	)
}
