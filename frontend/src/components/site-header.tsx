'use client'

import { api } from '@/lib/api'
import type { UserItem } from '@/types'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type UserRole = 'student' | 'teacher' | 'admin' | 'superadmin'

const roleSet = new Set<UserRole>(['student', 'teacher', 'admin', 'superadmin'])

export function SiteHeader() {
	const pathname = usePathname()
	const [user, setUser] = useState<UserItem | null>(null)

	useEffect(() => {
		let cancelled = false
		api<{ user: UserItem }>('/auth/me', undefined, true)
			.then((result) => {
				if (!cancelled) {
					setUser(result.user)
				}
			})
			.catch(() => {
				if (!cancelled) {
					setUser(null)
				}
			})
		return () => {
			cancelled = true
		}
	}, [pathname])

	const role = useMemo<UserRole | null>(() => {
		const value = user?.role
		return value && roleSet.has(value as UserRole) ? (value as UserRole) : null
	}, [user])
	const isAuthenticated = Boolean(user)
	const links = useMemo(() => {
		const common = [
			{ href: '/', label: 'Главная' },
			{ href: '/parent', label: 'Родители' },
		]
		if (!isAuthenticated) return common

		const secured = [
			{ href: '/dashboard', label: 'Кабинет' },
			{ href: '/roadmap', label: 'Уроки' },
			{ href: '/leaderboard', label: 'Рейтинг' },
			{ href: '/profile', label: 'Профиль' },
		]

		if (role === 'teacher')
			secured.splice(3, 0, { href: '/teacher', label: 'Учитель' })
		if (role === 'admin' || role === 'superadmin')
			secured.splice(3, 0, { href: '/admin', label: 'Админ' })
		if (role === 'superadmin')
			secured.splice(4, 0, { href: '/superadmin', label: 'Суперадмин' })

		return [...common, ...secured]
	}, [isAuthenticated, role])

	return (
		<header className='sticky top-0 z-50 overflow-x-clip border-b border-white/60 bg-white/70 backdrop-blur-xl'>
			<div className='site-header-shell mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 pb-2.5 pt-3 sm:px-6 sm:pb-3 sm:pt-3.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3'>
				<Link
					href='/'
					className='flex min-w-0 items-center justify-center gap-3 text-center lg:basis-auto lg:flex-none lg:text-left'
				>
					<Image
						src='/progyx-logo.png'
						alt='Логотип Progyx'
						width={56}
						height={56}
						className='h-14 w-14 shrink-0 object-contain drop-shadow-[0_10px_22px_rgba(14,165,233,0.2)]'
						priority
					/>
					<div className='min-w-0 self-center'>
						<p className='text-[9px] font-bold uppercase tracking-[0.24em] text-sky-600 sm:text-xs'>
							Progyx
						</p>
						<h1 className='truncate text-sm font-black leading-tight text-slate-900 sm:text-lg'>
							Обучающая платформа
						</h1>
					</div>
				</Link>

				<nav className='order-3 grid w-full max-w-4xl grid-cols-2 justify-center gap-2 sm:grid-cols-3 lg:order-none lg:flex lg:w-auto lg:flex-1 lg:flex-wrap lg:items-center lg:justify-center lg:gap-2.5'>
					{links.map(link => {
						const isActive =
							pathname === link.href ||
							(link.href !== '/' && pathname?.startsWith(link.href))
						return (
							<Link
								key={link.href}
								href={link.href}
								className={`min-h-11 min-w-0 rounded-full px-3 py-2.5 text-center text-xs font-semibold transition sm:px-4 sm:text-sm ${
									isActive
										? 'bg-slate-900 text-white'
										: 'bg-white text-slate-700 shadow-sm'
								}`}
							>
								{link.label}
							</Link>
						)
					})}
				</nav>

				<div className='order-2 flex w-full flex-wrap items-center justify-center gap-2 lg:ml-auto lg:w-auto lg:justify-center lg:gap-2.5'>
					{isAuthenticated ? (
						<button
							className='inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white sm:flex-none'
							onClick={() => {
								void api('/auth/logout', { method: 'POST' }, 'required')
									.catch(() => undefined)
									.finally(() => {
										setUser(null)
										window.location.href = '/auth/login'
									})
							}}
						>
							Выйти
						</button>
					) : (
						<>
							<Link
								href='/auth/login'
								className='inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm sm:flex-none'
							>
								Войти
							</Link>
							<Link
								href='/auth/register'
								className='inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white sm:flex-none'
							>
								Регистрация
							</Link>
						</>
					)}
				</div>
			</div>
		</header>
	)
}
