'use client'

import { useUserPageMotion } from '@/hooks/use-user-page-motion'
import { api } from '@/lib/api'
import { useEffect, useRef, useState } from 'react'

interface Row {
	position: number
	username?: string | null
	full_name?: string | null
	xp: number
	level: number
	age_group: string
	name?: string | null
}

function formatLeaderboardIdentity(row: Row) {
	const displayName =
		typeof row.full_name === 'string' && row.full_name.trim()
			? row.full_name.trim()
			: typeof row.name === 'string'
				? row.name.trim()
			: ''
	const username =
		typeof row.username === 'string'
			? row.username.trim()
			: ''

	if (displayName && username && displayName !== username) {
		return `${displayName} · ${username}`
	}

	return displayName || username || `Участник #${row.position}`
}

export default function LeaderboardPage() {
	const rootRef = useRef<HTMLElement | null>(null)
	const [rows, setRows] = useState<Row[]>([])

	useUserPageMotion(rootRef, [rows.length])

	useEffect(() => {
		api<{ leaderboard: Row[] }>('/leaderboard', undefined, true)
			.then(data => setRows(data.leaderboard))
			.catch(() => setRows([]))
	}, [])

	const podium = rows.slice(0, 3)
	const rest = rows.slice(3)

	return (
		<main ref={rootRef} className='brand-app-shell'>
			<div className='page-shell mx-auto w-full max-w-[96rem]'>
				<section
					className='codequest-card overflow-hidden p-6 sm:p-8'
					data-motion-reveal
				>
					<p className='brand-eyebrow'>Top players</p>
					<h1 className='mt-3 text-4xl font-black leading-tight text-slate-900 sm:text-5xl'>
						Рейтинг учеников с акцентом на тех, кто сейчас ведёт группу вперёд.
					</h1>

					{podium.length > 0 && (
						<div className='leaderboard-podium mt-8' data-motion-stagger>
							{podium.map((row, index) => (
								<article
									key={row.position}
									className={`leaderboard-podium__card p-5 ${index === 0 ? 'leaderboard-podium__card--top' : ''}`}
									data-motion-item
									data-motion-hover
								>
									<div className='flex items-center justify-between gap-3'>
										<span className='brand-chip brand-chip--soft'>
											#{row.position}
										</span>
										<span className='brand-chip brand-chip--warm'>
											{row.xp} XP
										</span>
									</div>
									<h2 className='mt-5 text-2xl font-black text-slate-900'>
										{formatLeaderboardIdentity(row)}
									</h2>
									<div className='mt-4 flex flex-wrap gap-2 text-sm text-slate-600'>
										<span className='rounded-full bg-slate-50 px-3 py-1'>
											Группа: {row.age_group}
										</span>
										<span className='rounded-full bg-slate-50 px-3 py-1'>
											Уровень: {row.level}
										</span>
									</div>
								</article>
							))}
						</div>
					)}

					<div className='mt-8 space-y-3 md:hidden' data-motion-stagger>
						{rest.map(row => (
							<article
								key={row.position}
								className='rounded-[22px] border border-slate-200 bg-slate-50 p-4'
								data-motion-item
							>
								<div className='flex items-start justify-between gap-3'>
									<div>
										<p className='text-xs font-bold uppercase tracking-[0.16em] text-slate-500'>
											#{row.position}
										</p>
										<h2 className='mt-1 text-lg font-black text-slate-900'>
											{formatLeaderboardIdentity(row)}
										</h2>
									</div>
									<span className='rounded-full bg-white px-3 py-1 text-sm font-semibold text-sky-700'>
										{row.xp} XP
									</span>
								</div>
								<div className='mt-3 flex flex-wrap gap-2 text-sm text-slate-600'>
									<span className='rounded-full bg-white px-3 py-1'>
										Группа: {row.age_group}
									</span>
									<span className='rounded-full bg-white px-3 py-1'>
										Уровень: {row.level}
									</span>
								</div>
							</article>
						))}
					</div>
					<div
						className='mt-6 hidden overflow-x-auto md:block'
						data-motion-reveal
					>
						<table className='min-w-full text-left'>
							<thead>
								<tr className='border-b border-slate-200 text-sm text-slate-500'>
									<th className='px-4 py-3'>#</th>
									<th className='px-4 py-3'>Пользователь</th>
									<th className='px-4 py-3'>Возрастная группа</th>
									<th className='px-4 py-3'>Уровень</th>
									<th className='px-4 py-3'>XP</th>
								</tr>
							</thead>
							<tbody>
								{rest.map(row => (
									<tr
										key={row.position}
										className='border-b border-slate-100 text-sm'
									>
										<td className='px-4 py-4 font-bold text-slate-900'>
											{row.position}
										</td>
										<td className='px-4 py-4'>
											{formatLeaderboardIdentity(row)}
										</td>
										<td className='px-4 py-4'>{row.age_group}</td>
										<td className='px-4 py-4'>{row.level}</td>
										<td className='px-4 py-4 font-semibold text-sky-700'>
											{row.xp}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			</div>
		</main>
	)
}
