import { NextRequest, NextResponse } from 'next/server'

const requiresAuth =
    process.env.NODE_ENV === 'development' &&
    process.env.BASIC_AUTH_USERNAME &&
    process.env.BASIC_AUTH_PASSWORD

export function middleware(req: NextRequest) {
    if (!requiresAuth) return NextResponse.next()

    const basicAuth = req.headers.get('authorization')
    const url = req.nextUrl

    if (basicAuth) {
        const authValue = basicAuth.split(' ')[1]
        const [user, pwd] = atob(authValue).split(':')

        if (
            user === process.env.BASIC_AUTH_USERNAME &&
            pwd === process.env.BASIC_AUTH_PASSWORD
        ) {
            return NextResponse.next()
        }
    }
    url.pathname = '/api/auth'

    return NextResponse.rewrite(url)
}
