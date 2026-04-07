import { NextRequest, NextResponse } from 'next/server'

type UserRole = 'student' | 'teacher' | 'admin' | 'superadmin'

const ACCESS_COOKIE = 'codequest_access_token'
const REFRESH_COOKIE = 'codequest_refresh_token'
const BACKEND_API_URL = (
	process.env.INTERNAL_API_URL || 'http://localhost:8000/api'
).replace(/\/$/, '')
const KNOWN_ROLES: UserRole[] = ['student', 'teacher', 'admin', 'superadmin']
const AUTH_ROUTES = ['/auth/login', '/auth/register']
const ROLE_RULES: Array<{ path: string; roles: UserRole[] }> = [
	{ path: '/dashboard', roles: KNOWN_ROLES },
	{ path: '/roadmap', roles: KNOWN_ROLES },
	{ path: '/lessons', roles: KNOWN_ROLES },
	{ path: '/leaderboard', roles: KNOWN_ROLES },
	{ path: '/profile', roles: KNOWN_ROLES },
	{ path: '/teacher', roles: ['teacher'] },
	{ path: '/admin', roles: ['admin', 'superadmin'] },
	{ path: '/superadmin', roles: ['superadmin'] },
]

function pathMatches(pathname: string, target: string) {
	return pathname === target || pathname.startsWith(`${target}/`)
}

function isKnownRole(value: string | undefined): value is UserRole {
	return !!value && KNOWN_ROLES.includes(value as UserRole)
}

function loginUrl(request: NextRequest) {
	return new URL('/auth/login', request.url)
}

function dashboardUrl(request: NextRequest) {
	return new URL('/dashboard', request.url)
}

function authCookieHeader(request: NextRequest) {
	const parts = [ACCESS_COOKIE, REFRESH_COOKIE]
		.map((name) => {
			const value = request.cookies.get(name)?.value
			return value ? `${name}=${encodeURIComponent(value)}` : ''
		})
		.filter(Boolean)
	return parts.join('; ')
}

function clearAuthCookies(response: NextResponse) {
	response.cookies.delete(ACCESS_COOKIE)
	response.cookies.delete(REFRESH_COOKIE)
	return response
}

function upstreamSetCookies(response: Response) {
	const headers = response.headers as Headers & {
		getSetCookie?: () => string[]
	}
	if (typeof headers.getSetCookie === 'function') {
		return headers.getSetCookie()
	}
	const fallback = response.headers.get('set-cookie')
	return fallback ? [fallback] : []
}

function applyUpstreamAuthCookies(target: NextResponse, upstream: Response) {
	for (const cookie of upstreamSetCookies(upstream)) {
		target.headers.append('set-cookie', cookie)
	}
	return target
}

async function fetchSession(request: NextRequest) {
	const cookieHeader = authCookieHeader(request)
	if (!cookieHeader) return null

	try {
		const response = await fetch(`${BACKEND_API_URL}/auth/me`, {
			headers: {
				accept: 'application/json',
				cookie: cookieHeader,
			},
			cache: 'no-store',
		})
		if (!response.ok) {
			return null
		}
		const data = (await response.json().catch(() => ({}))) as {
			user?: { role?: string }
		}
		return isKnownRole(data.user?.role) ? data.user.role : null
	} catch {
		return null
	}
}

async function refreshSession(request: NextRequest) {
	const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value
	if (!refreshToken) return null

	try {
		const response = await fetch(`${BACKEND_API_URL}/auth/refresh`, {
			method: 'POST',
			headers: {
				accept: 'application/json',
				cookie: authCookieHeader(request),
			},
			cache: 'no-store',
		})
		const data = (await response.json().catch(() => ({}))) as {
			user?: { role?: string }
		}
		if (!response.ok || !isKnownRole(data.user?.role)) {
			return null
		}
		return {
			role: data.user.role,
			response,
		}
	} catch {
		return null
	}
}

export async function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname
	const isAuthRoute = AUTH_ROUTES.some((route) => pathMatches(pathname, route))
	const roleRule = ROLE_RULES.find((rule) => pathMatches(pathname, rule.path))

	if (!isAuthRoute && !roleRule) {
		return NextResponse.next()
	}

	const currentRole = await fetchSession(request)
	if (currentRole) {
		if (isAuthRoute) {
			return NextResponse.redirect(dashboardUrl(request))
		}
		if (roleRule && !roleRule.roles.includes(currentRole)) {
			return NextResponse.redirect(dashboardUrl(request))
		}
		return NextResponse.next()
	}

	const refreshedSession = await refreshSession(request)
	if (refreshedSession) {
		if (isAuthRoute) {
			return applyUpstreamAuthCookies(
				NextResponse.redirect(dashboardUrl(request)),
				refreshedSession.response,
			)
		}

		const response =
			roleRule && !roleRule.roles.includes(refreshedSession.role)
				? NextResponse.redirect(dashboardUrl(request))
				: NextResponse.next()
		return applyUpstreamAuthCookies(response, refreshedSession.response)
	}

	if (isAuthRoute) {
		return request.cookies.get(ACCESS_COOKIE) || request.cookies.get(REFRESH_COOKIE)
			? clearAuthCookies(NextResponse.next())
			: NextResponse.next()
	}

	return clearAuthCookies(NextResponse.redirect(loginUrl(request)))
}

export const config = {
	matcher: [
		'/dashboard/:path*',
		'/roadmap/:path*',
		'/lessons/:path*',
		'/leaderboard/:path*',
		'/profile/:path*',
		'/teacher/:path*',
		'/admin/:path*',
		'/superadmin/:path*',
		'/auth/login/:path*',
		'/auth/register/:path*',
	],
}
