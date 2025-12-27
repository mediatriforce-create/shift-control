
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

    useEffect(() => {
        const checkUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.push('/login')
                    return
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('company_id, role')
                    .eq('id', user.id)
                    .single()

                if (!profile?.company_id) {
                    // Se não tem empresa selecionada/vinculada
                    // Fix: Check if profile exists before accessing role
                    if (profile?.role === 'admin' || profile?.role === 'manager') {
                        // Admin: Manda para seleção de empresas (se não estiver lá nem no setup)
                        if (pathname !== '/dashboard/companies' && pathname !== '/dashboard/setup') {
                            router.push('/dashboard/companies')
                        }
                    } else {
                        // Funcionário e outros casos (ou profile null)
                        if (pathname !== '/dashboard/setup') {
                            router.push('/login')
                        }
                    }
                } else {
                    // Tem empresa selecionada
                    setUserRole(profile.role)

                    // Se tentar acessar Setup ou Companies com empresa já selecionada,
                    // podemos deixar (para criar outra) ou redirecionar.
                    // O usuário quer "caiu lá, escolheu".
                    // Vamos deixar ele acessar 'companies' para poder TROCAR.

                    if (pathname === '/dashboard/setup') {
                        // Se já tem empresa, setup cria UMA NOVA.
                        // Não redireciona. Deixa criar.
                    }
                }

                // Force "Landing" on Companies Page for Admins (Optional but requested "Toda vez...")
                // Se acabou de logar (chegou no /dashboard raiz) e é admin -> Manda escolher empresa
                if ((profile?.role === 'admin' || profile?.role === 'manager') && pathname === '/dashboard') {
                    // router.push('/dashboard/companies') // Comentado para não criar loop se já tiver company_id
                    // Mas se ele quer "Qual empresa quer mexer hoje?", o ideal é SEMPRE cair lá.
                    // Vamos manter simples por enquanto: Se não tem ID, vai pra lá. 
                    // Se tem ID, vai pro dashboard daquela empresa.
                    // O usuário pode clicar em "Trocar Empresa" (vamos adicionar no sidebar).
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

    const isAdmin = userRole === 'admin' || userRole === 'manager'

    return (
        <div className="min-h-screen bg-zinc-950 flex text-white font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 p-6 flex flex-col fixed inset-y-0 left-0 bg-zinc-950 z-10">
                <div className="mb-8 pl-3">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        ShiftControl
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
                        {isAdmin ? 'Área do Gestor' : 'Funcionário'}
                    </p>
                </div>

                <nav className="space-y-2 flex-1">
                    {/* Common */}
                    <NavItem href="/dashboard" icon={<LayoutDashboard />} label="Início" active={pathname === '/dashboard'} />
                    <NavItem href="/dashboard/profile" icon={<User />} label="Meu Perfil" active={pathname.startsWith('/dashboard/profile')} />

                    {/* Admin Only */}
                    {isAdmin && (
                        <>
                            <NavItem href="/dashboard/companies" icon={<Building2 />} label="Trocar Empresa" active={pathname === '/dashboard/companies'} />
                            <NavItem href="/dashboard/employees" icon={<Users />} label="Funcionários" active={pathname.startsWith('/dashboard/employees')} />
                            <NavItem href="/dashboard/shifts" icon={<Calendar />} label="Turnos" active={pathname.startsWith('/dashboard/shifts')} />
                            <NavItem href="/dashboard/audit" icon={<ClipboardList />} label="Auditoria" active={pathname.startsWith('/dashboard/audit')} />
                        </>
                    )}

                    {/* Employee Only */}
                    {!isAdmin && (
                        <>
                            <NavItem href="/dashboard/my-schedule" icon={<CalendarRange />} label="Minha Escala" active={pathname.startsWith('/dashboard/my-schedule')} />
                            <NavItem href="/dashboard/ponto" icon={<Clock />} label="Bater Ponto" active={pathname.startsWith('/dashboard/ponto')} />
                        </>
                    )}
                </nav>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors p-3 rounded-xl hover:bg-white/5 w-full text-left"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Sair</span>
                </button>
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
