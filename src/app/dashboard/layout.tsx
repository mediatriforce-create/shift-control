
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, LayoutDashboard, Users, Calendar, Clock, CalendarRange, ClipboardList, Loader2, User, Building2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(true)
    const [userRole, setUserRole] = useState<string | null>(null)
    const [companyId, setCompanyId] = useState<string | null>(null)

    useEffect(() => {
        const checkUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.push('/login')
                    return
                }

                // 1. Fetch Fresh Profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('company_id, role')
                    .eq('id', user.id)
                    .single()

                // 2. State Management
                setUserRole(profile?.role || null)
                setCompanyId(profile?.company_id || null)
                const hasCompany = !!profile?.company_id
                const isSetupPage = pathname === '/dashboard/setup'
                const isCompaniesPage = pathname === '/dashboard/companies'

                // 3. Redirection Logic (Hierarchy)

                // A. No Company? -> Go to Setup or Companies (Admins)
                if (!hasCompany) {
                    if (profile?.role === 'admin' || profile?.role === 'manager') {
                        // Admin without company -> Force Companies/Setup
                        if (!isCompaniesPage && !isSetupPage) {
                            router.push('/dashboard/companies')
                        }
                    } else {
                        // User without company -> MUST go to Setup (Waiting Screen or Create)
                        if (!isSetupPage) {
                            router.push('/dashboard/setup')
                        }
                    }
                    return // Stop further checks
                }

                // B. Has Company? -> Allow Normal Flow
                // If on Setup/Companies but ALREADY HAS COMPANY, we might want to redirect to Dashboard
                // unless they explicitly want to change company (Companies Page).
                // But Setup Page is useless if they have a company (Auto-Join worked).
                if (hasCompany && isSetupPage && profile?.role === 'employee') {
                    // Employee stuck on Setup? Kick to Dashboard.
                    router.push('/dashboard')
                }

            } catch (error) {
                console.error('Check user error:', error)
            } finally {
                setIsLoading(false)
            }
        }

        checkUser()
    }, [pathname, router, supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    // Hide Sidebar on Setup Page or Companies Page
    if (pathname === '/dashboard/setup' || pathname === '/dashboard/companies') {
        return (
            <main className="min-h-screen bg-zinc-950 text-white font-sans">
                {children}
            </main>
        )
    }

    // BLOCKER: Se não tem empresa, NÃO RENDERIZA NADA (exceto se já estiver na página de setup/companies)
    // Isso força o redirecionamento acontecer visualmente sem "piscar" o dashboard errado.
    const mustSetup = !userRole && pathname !== '/dashboard/setup'

    // Se for admin mas não tem empresa, force setup/companies
    const isAdminUser = userRole === 'admin' || userRole === 'manager' || userRole === 'owner'
    const isAdminOnWrongPage = isAdminUser && !companyId && pathname !== '/dashboard/companies' && pathname !== '/dashboard/setup'

    if ((mustSetup || isAdminOnWrongPage) && !isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white flex-col gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-zinc-500 animate-pulse">Redirecionando para configuração...</p>
            </div>
        )
    }

    const isAdmin = isAdminUser // Reuse logic

    return (
        <div className="min-h-screen bg-zinc-950 flex text-white font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 p-6 flex flex-col fixed inset-y-0 left-0 bg-zinc-950 z-10">
                <div className="mb-8 pl-3">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        ShiftControl
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
                        {isAdmin ? 'Área do Gestor' : (userRole === 'employee' ? 'Funcionário' : 'Bem-vindo')}
                    </p>
                </div>

                <nav className="space-y-2 flex-1">
                    {/* Common */}
                    <NavItem href="/dashboard" icon={<LayoutDashboard />} label="Início" active={pathname === '/dashboard'} />

                    {/* Admin/Owner Only */}
                    {isAdmin && (
                        <>
                            <NavItem href="/dashboard/employees" icon={<Users />} label="Funcionários" active={pathname.startsWith('/dashboard/employees')} />
                            <NavItem href="/dashboard/shifts" icon={<Calendar />} label="Turnos" active={pathname.startsWith('/dashboard/shifts')} />
                            <NavItem href="/dashboard/audit" icon={<ClipboardList />} label="Auditoria" active={pathname.startsWith('/dashboard/audit')} />
                        </>
                    )}

                    {/* Employee Only */}
                    {userRole === 'employee' && (
                        <>
                            <NavItem href="/dashboard/my-schedule" icon={<CalendarRange />} label="Minha Escala" active={pathname.startsWith('/dashboard/my-schedule')} />
                            <NavItem href="/dashboard/ponto" icon={<Clock />} label="Bater Ponto" active={pathname.startsWith('/dashboard/ponto')} />
                        </>
                    )}
                </nav>

                <div className="space-y-2 pt-4 border-t border-white/10">
                    {/* Admin: Trocar Empresa no rodapé */}
                    {isAdmin && (
                        <NavItem href="/dashboard/companies" icon={<Building2 />} label="Trocar Empresa" active={pathname === '/dashboard/companies'} />
                    )}

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors p-3 rounded-xl hover:bg-white/5 w-full text-left"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Sair</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8">
                {children}
            </main>
        </div>
    )
}

function NavItem({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
    return (
        <Link
            href={href}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-blue-600/10 text-blue-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
        >
            <div className="w-5 h-5">{icon}</div>
            <span className="font-medium">{label}</span>
        </Link>
    )
}
