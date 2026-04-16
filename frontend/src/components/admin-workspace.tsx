'use client'

import { AdminLessonBuilder } from '@/components/admin-lesson-builder'
import { api } from '@/lib/api'
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast'
import { ModuleItem, UserItem } from '@/types'
import { useEffect, useState, type FormEvent } from 'react'

const USERNAME_MAX_LENGTH = 10

interface OverviewData {
	stats: {
		users: number
		students: number
		teachers: number
		modules: number
		lessons: number
	}
}

interface AdminWorkspaceInitialData {
	overview?: OverviewData | null
	modules?: ModuleItem[]
	users?: UserItem[]
}

const STAT_LABELS: Record<string, string> = {
	users: 'Пользователи',
	students: 'Ученики',
	teachers: 'Учителя',
	modules: 'Модули',
	lessons: 'Уроки',
}

function hasPasswordWhitespace(value: string) {
	return /\s/.test(value)
}

export function AdminWorkspace({
	superMode = false,
	initialData,
}: {
	superMode?: boolean
	initialData?: AdminWorkspaceInitialData
}) {
	const hasInitialPayload = Boolean(
		initialData?.overview &&
		Array.isArray(initialData?.modules) &&
		(!superMode || Array.isArray(initialData?.users)),
	)
	const [overview, setOverview] = useState<OverviewData | null>(
		initialData?.overview || null,
	)
	const [modules, setModules] = useState<ModuleItem[]>(
		initialData?.modules ?? [],
	)
	const [users, setUsers] = useState<UserItem[]>(initialData?.users ?? [])
	const [moduleForm, setModuleForm] = useState({
		slug: '',
		title: '',
		description: '',
		age_group: 'middle',
		color: '#4A90D9',
	})
	const [adminForm, setAdminForm] = useState({
		full_name: '',
		email: '',
		username: '',
		password: '',
	})
	const roadmapModules = modules.filter(
		module => !module.is_custom_classroom_module,
	)

	async function load() {
		const [overviewData, modulesData] = await Promise.all([
			api<OverviewData>('/admin/overview', undefined, 'required'),
			api<{ modules: ModuleItem[] }>('/admin/modules', undefined, 'required'),
		])
		setOverview(overviewData)
		setModules(modulesData.modules)
		try {
			const usersData = await api<{ users: UserItem[] }>(
				'/admin/users',
				undefined,
				'required',
			)
			setUsers(usersData.users)
		} catch {
			setUsers([])
		}
	}

	useEffect(() => {
		if (hasInitialPayload) return
		load().catch(() =>
			showErrorToast(
				'Не удалось загрузить админ-панель. Проверьте права доступа и авторизацию.',
			),
		)
	}, [hasInitialPayload])

	async function createModule(event: FormEvent) {
		event.preventDefault()
		try {
			await api(
				'/admin/modules',
				{
					method: 'POST',
					body: JSON.stringify({ ...moduleForm, is_published: false }),
				},
				'required',
			)
			setModuleForm({
				slug: '',
				title: '',
				description: '',
				age_group: 'middle',
				color: '#4A90D9',
			})
			showSuccessToast('Модуль создан.')
			await load()
		} catch (error) {
			showErrorToast(
				error instanceof Error ? error.message : 'Не удалось создать модуль.',
			)
		}
	}

	async function toggleModule(moduleId: number, isPublished: boolean) {
		await api(
			`/admin/modules/${moduleId}`,
			{ method: 'PATCH', body: JSON.stringify({ is_published: !isPublished }) },
			'required',
		)
		await load()
	}

	async function deleteModule(module: ModuleItem) {
		if (module.is_published) {
			showInfoToast('Сначала снимите модуль с публикации.')
			return
		}

		const confirmed = window.confirm(
			`Удалить скрытый модуль "${module.title}"? Это удалит все уроки, практику и квизы внутри него.`,
		)
		if (!confirmed) return

		try {
			const response = await api<{ message: string }>(
				`/admin/modules/${module.id}`,
				{ method: 'DELETE' },
				'required',
			)
			showSuccessToast(response.message || 'Модуль удалён.')
			await load()
		} catch (error) {
			showErrorToast(
				error instanceof Error ? error.message : 'Ошибка удаления модуля.',
			)
		}
	}

	async function createAdmin(event: FormEvent) {
		event.preventDefault()
		const normalizedUsername = adminForm.username.trim()
		if (normalizedUsername.length > USERNAME_MAX_LENGTH) {
			showInfoToast(
				`Логин должен содержать не более ${USERNAME_MAX_LENGTH} символов.`,
			)
			return
		}
		if (adminForm.password.length < 12) {
			showInfoToast('Пароль должен содержать не менее 12 символов.')
			return
		}
		if (hasPasswordWhitespace(adminForm.password)) {
			showInfoToast('Пароль не должен содержать пробелы.')
			return
		}
		try {
			await api(
				'/admin/admins',
				{
					method: 'POST',
					body: JSON.stringify({ ...adminForm, username: normalizedUsername }),
				},
				'required',
			)
			setAdminForm({ full_name: '', email: '', username: '', password: '' })
			showSuccessToast('Админ создан.')
			await load()
		} catch (error) {
			showErrorToast(
				error instanceof Error
					? error.message
					: 'Не удалось создать администратора.',
			)
		}
	}

	async function changeAdminState(
		userId: number,
		action: 'block' | 'unblock' | 'delete',
	) {
		try {
			await api(
				`/admin/admins/${userId}${action === 'delete' ? '' : `/${action}`}`,
				{ method: action === 'delete' ? 'DELETE' : 'PATCH' },
				'required',
			)
			showSuccessToast(`Действие ${action} выполнено.`)
			await load()
		} catch (error) {
			showErrorToast(
				error instanceof Error
					? error.message
					: 'Не удалось обновить состояние администратора.',
			)
		}
	}

	return (
		<div className='admin-workspace-shell space-y-6'>
			<section className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
				{overview &&
					Object.entries(overview.stats).map(([label, value]) => (
						<div key={label} className='brand-stat-card codequest-card p-5'>
							<p className='text-xs font-bold uppercase tracking-[0.18em] text-slate-500'>
								{STAT_LABELS[label] || label}
							</p>
							<p className='mt-3 text-4xl font-black text-slate-900'>{value}</p>
						</div>
					))}
			</section>

			<section className='space-y-6'>
				<AdminLessonBuilder modules={roadmapModules} onReload={load} />
			</section>

			<section className='grid gap-6 xl:grid-cols-[0.9fr_1.1fr]'>
				<div className='space-y-6'>
					<form onSubmit={createModule} className='codequest-card p-6'>
						<p className='brand-eyebrow'>Новый модуль</p>
						<h2 className='mt-3 text-2xl font-black text-slate-900'>
							Создать и подготовить модуль к публикации
						</h2>
						<div className='mt-4 grid gap-3'>
							<input
								className='rounded-2xl border border-slate-200 px-4 py-3'
								placeholder='slug'
								value={moduleForm.slug}
								onChange={e =>
									setModuleForm({ ...moduleForm, slug: e.target.value })
								}
							/>
							<input
								className='rounded-2xl border border-slate-200 px-4 py-3'
								placeholder='Название'
								value={moduleForm.title}
								onChange={e =>
									setModuleForm({ ...moduleForm, title: e.target.value })
								}
							/>
							<textarea
								className='min-h-28 rounded-2xl border border-slate-200 px-4 py-3'
								placeholder='Описание'
								value={moduleForm.description}
								onChange={e =>
									setModuleForm({ ...moduleForm, description: e.target.value })
								}
							/>
							<div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
								<select
									className='rounded-2xl border border-slate-200 px-4 py-3'
									value={moduleForm.age_group}
									onChange={e =>
										setModuleForm({ ...moduleForm, age_group: e.target.value })
									}
								>
									<option value='junior'>junior</option>
									<option value='middle'>middle</option>
									<option value='senior'>senior</option>
								</select>
								<input
									className='rounded-2xl border border-slate-200 px-4 py-3'
									type='color'
									value={moduleForm.color}
									onChange={e =>
										setModuleForm({ ...moduleForm, color: e.target.value })
									}
								/>
							</div>
						</div>
						<button className='mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white'>
							Создать модуль
						</button>
					</form>

					{superMode && (
						<form onSubmit={createAdmin} className='codequest-card p-6'>
							<p className='brand-eyebrow'>Новый администратор</p>
							<h2 className='mt-3 text-2xl font-black text-slate-900'>
								Выдать доступ к панели управления
							</h2>
							<div className='mt-4 grid gap-3'>
								<input
									className='rounded-2xl border border-slate-200 px-4 py-3'
									placeholder='ФИО'
									value={adminForm.full_name}
									onChange={e =>
										setAdminForm({ ...adminForm, full_name: e.target.value })
									}
								/>
								<div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
									<input
										className='rounded-2xl border border-slate-200 px-4 py-3'
										placeholder='Email'
										value={adminForm.email}
										onChange={e =>
											setAdminForm({ ...adminForm, email: e.target.value })
										}
									/>
									<input
										className='rounded-2xl border border-slate-200 px-4 py-3'
										placeholder='Username'
										maxLength={USERNAME_MAX_LENGTH}
										value={adminForm.username}
										onChange={e =>
											setAdminForm({
												...adminForm,
												username: e.target.value.slice(0, USERNAME_MAX_LENGTH),
											})
										}
									/>
								</div>
								<input
									className='rounded-2xl border border-slate-200 px-4 py-3'
									placeholder='Пароль (минимум 12 символов, строчные/заглавные буквы, цифра, спецсимвол)'
									value={adminForm.password}
									onChange={e =>
										setAdminForm({ ...adminForm, password: e.target.value })
									}
								/>
							</div>
							<button className='mt-4 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white'>
								Создать админа
							</button>
						</form>
					)}
				</div>

				<div className='space-y-6'>
					<section className='codequest-card p-6'>
						<p className='brand-eyebrow'>Каталог модулей</p>
						<h2 className='mt-3 text-2xl font-black text-slate-900'>
							Что уже опубликовано и что пока скрыто
						</h2>
						<div className='mt-4 space-y-3'>
							{roadmapModules.map(module => (
								<div
									key={module.id}
									className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
								>
									<div className='flex flex-wrap items-center justify-between gap-3'>
										<div>
											<p className='break-words text-lg font-black text-slate-900'>
												{module.title}
											</p>
											<p className='break-words text-sm text-slate-500'>
												{module.age_group} · {module.lessons.length} уроков ·{' '}
												{module.is_published ? 'в уроках' : 'скрыт'}
											</p>
										</div>
										<div className='flex flex-wrap gap-2'>
											<button
												onClick={() =>
													toggleModule(module.id, module.is_published)
												}
												className={`rounded-full px-4 py-2 text-sm font-semibold ${module.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white'}`}
											>
												{module.is_published
													? 'Снять с публикации'
													: 'Опубликовать'}
											</button>
											{!module.is_published && (
												<button
													type='button'
													onClick={() => deleteModule(module)}
													className='rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700'
												>
													Удалить
												</button>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					</section>

					{superMode && (
						<section className='codequest-card p-6'>
							<p className='brand-eyebrow'>Управление админами</p>
							<h2 className='mt-3 text-2xl font-black text-slate-900'>
								Статус доступа и действия по аккаунтам
							</h2>
							<div className='mt-4 space-y-3'>
								{users
									.filter(user => user.role === 'admin')
									.map(user => (
										<div
											key={user.id}
											className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
										>
											<div className='flex flex-wrap items-center justify-between gap-3'>
												<div>
													<p className='break-words text-lg font-black text-slate-900'>
														{user.full_name}
													</p>
													<p className='break-words text-sm text-slate-500'>
														@{user.username} · {user.email}
													</p>
												</div>
												<div className='flex flex-wrap gap-2'>
													<button
														onClick={() =>
															changeAdminState(
																user.id,
																user.is_active ? 'block' : 'unblock',
															)
														}
														className='rounded-full bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700'
													>
														{user.is_active ? 'Блокировать' : 'Разблокировать'}
													</button>
													<button
														onClick={() => changeAdminState(user.id, 'delete')}
														className='rounded-full bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700'
													>
														Удалить
													</button>
												</div>
											</div>
										</div>
									))}
							</div>
						</section>
					)}
				</div>
			</section>
		</div>
	)
}
