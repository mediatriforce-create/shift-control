'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Plus, ArrowRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const fetchCompanies = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Fetch companies OWNED by this user
            const { data: ownedCompanies } = await supabase
                .from('companies')
                .select('*')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false })

            if (ownedCompanies) {
                setCompanies(ownedCompanies)
            }
            setLoading(false)
        }
        fetchCompanies()
    }, [supabase])

    const handleSelectCompany = async (companyId: string) => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Update profile to set active company
        const { error } = await supabase
            .from('profiles')
            .update({ company_id: companyId })
            .eq('id', user.id)

        if (error) {
            console.error('Error selecting company:', error)
            alert('Erro ao selecionar empresa.')
            setLoading(false)
            return
        }

        // Redirect to dashboard
        router.push('/dashboard')
        router.refresh() // Force layout to re-fetch profile
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans p-8 flex flex-col items-center justify-center">
            <div className="max-w-2xl w-full space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">Minhas Empresas</h1>
                    <p className="text-zinc-400">Qual empresa você quer gerenciar hoje?</p>
                </div>

                <div className="grid gap-4">
                    {companies.map((company) => (
                        <button
                            key={company.id}
                            onClick={() => handleSelectCompany(company.id)}
                            className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between hover:border-blue-500/50 hover:bg-zinc-800/50 transition-all group text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                                        {company.name}
                                    </h3>
                                    <p className="text-sm text-zinc-500">
                                        {company.cnpj || 'Sem CNPJ'} • {company.status === 'active' ? 'Ativa' : 'Inativa'}
                                    </p>
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                        </button>
                    ))}

                    <button
                        onClick={() => router.push('/dashboard/setup')}
                        className="bg-transparent border border-dashed border-zinc-700 p-6 rounded-2xl flex items-center justify-center gap-2 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Criar Nova Empresa</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
