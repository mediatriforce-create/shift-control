'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Briefcase, Building2, Calendar, Loader2 } from 'lucide-react'

export default function ProfilePage() {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<any>(null)
    const [companyName, setCompanyName] = useState('')
    const supabase = createClient()

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Fetch Profile + Company Name
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('*, companies(name)')
                .eq('id', user.id)
                .single()

            if (userProfile) {
                setProfile(userProfile)
                // @ts-ignore - Supabase join type inference can be tricky
                setCompanyName(userProfile.companies?.name || 'Empresa não identificada')
            }
            setLoading(false)
        }
        fetchProfile()
    }, [supabase])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    if (!profile) return <div>Erro ao carregar perfil.</div>

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Meu Perfil</h1>
                <p className="text-zinc-400">Suas informações de acesso e trabalho.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                    {/* Avatar Placeholder */}
                    <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 border-4 border-zinc-900 flex items-center justify-center shrink-0 shadow-2xl">
                        <User className="w-16 h-16 text-zinc-400" />
                    </div>

                    <div className="flex-1 space-y-6 w-full">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Nome */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                    <User className="w-4 h-4" /> Nome Completo
                                </label>
                                <div className="p-3 bg-black/40 border border-zinc-800 rounded-xl text-white font-medium">
                                    {profile.full_name || 'Não informado'}
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                    <Mail className="w-4 h-4" /> Email
                                </label>
                                <div className="p-3 bg-black/40 border border-zinc-800 rounded-xl text-white font-medium">
                                    {profile.email}
                                </div>
                            </div>

                            {/* Empresa */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> Empresa
                                </label>
                                <div className="p-3 bg-black/40 border border-zinc-800 rounded-xl text-white font-medium">
                                    {companyName}
                                </div>
                            </div>

                            {/* Cargo */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                    <Briefcase className="w-4 h-4" /> Cargo/Função
                                </label>
                                <div className="p-3 bg-black/40 border border-zinc-800 rounded-xl text-white font-medium uppercase tracking-wide text-xs">
                                    <span className={`px-2 py-1 rounded-md ${profile.role === 'admin' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                        {profile.role === 'admin' ? 'Gestor / Admin' : 'Funcionário'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-800">
                            <p className="text-sm text-zinc-500">
                                * Para alterar seus dados cadastrais, solicite ao Administrador da empresa.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
