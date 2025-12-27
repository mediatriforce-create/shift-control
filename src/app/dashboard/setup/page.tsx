'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Building2, Users, Loader2, Check, Plus, Trash2 } from 'lucide-react'

export default function SetupPage() {
    const [step, setStep] = useState<1 | 2>(1)
    const [companyName, setCompanyName] = useState('')
    const [loading, setLoading] = useState(false)
    const [employees, setEmployees] = useState<{ email: string }[]>([{ email: '' }])
    const [error, setError] = useState<string | null>(null)

    const router = useRouter()
    const supabase = createClient()

    // Step 1: Create Company
    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // 1. Get User
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuário não autenticado')

            // 2. Create Company (with owner_id)
            const { data: company, error: companyError } = await supabase
                .from('companies')
                .insert({
                    name: companyName,
                    owner_id: user.id // Vincula o dono
                })
                .select()
                .single()

            if (companyError) throw companyError

            // 2. Link Profile to Company
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ company_id: company.id })
                .eq('id', (await supabase.auth.getUser()).data.user?.id)

            if (profileError) throw profileError

            setStep(2)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Step 2: Invite Employees
    const handleAddEmployeeField = () => {
        setEmployees([...employees, { email: '' }])
    }

    const handleRemoveEmployeeField = (index: number) => {
        const newEmployees = [...employees]
        newEmployees.splice(index, 1)
        setEmployees(newEmployees)
    }

    const handleEmployeeEmailChange = (index: number, value: string) => {
        const newEmployees = [...employees]
        newEmployees[index].email = value
        setEmployees(newEmployees)
    }

    const handleInviteEmployees = async () => {
        setLoading(true)
        setError(null)

        try {
            // Get current company_id (we just set it, so refine would technically need refreshing, 
            // but we can just use the user's profile or refresh checks. 
            // For safety, let's fetch profile first or assume the one we just linked)

            // Get user to be sure
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No user found')

            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single()

            if (!profile?.company_id) throw new Error('Empresa não encontrada.')

            // Filter valid emails
            const validEmails = employees.filter(e => e.email.trim() !== '')

            if (validEmails.length === 0) {
                // Skip if empty
                router.push('/dashboard')
                return
            }

            const invites = validEmails.map(e => ({
                company_id: profile.company_id,
                email: e.email,
                role: 'employee',
                status: 'pending'
            }))

            const { error: inviteError } = await supabase
                .from('company_invites')
                .insert(invites)

            if (inviteError) throw inviteError

            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const [userType, setUserType] = useState<'owner' | 'employee' | null>(null)
    const [userEmail, setUserEmail] = useState('')

    // Fetch user email on mount
    useState(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user?.email) setUserEmail(data.user.email)
        })
    })

    // ... existing handlers ...

    // Back to Selection
    const handleBack = () => {
        setUserType(null)
        setStep(1)
    }

    if (!userType) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl space-y-8 animate-in fade-in zoom-in duration-500">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo ao ShiftControl</h1>
                        <p className="text-zinc-400">Como você deseja usar a plataforma?</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Option 1: Owner */}
                        <button
                            onClick={() => setUserType('owner')}
                            className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl hover:border-blue-500/50 hover:bg-zinc-800/50 transition-all group text-left space-y-4"
                        >
                            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                <Building2 className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-white">Sou Gestor/Dono</h3>
                                <p className="text-zinc-400 text-sm mt-1">Quero criar uma empresa e gerenciar minha equipe.</p>
                            </div>
                        </button>

                        {/* Option 2: Employee */}
                        <button
                            onClick={() => setUserType('employee')}
                            className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl hover:border-purple-500/50 hover:bg-zinc-800/50 transition-all group text-left space-y-4"
                        >
                            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                                <Users className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-white">Sou Funcionário</h3>
                                <p className="text-zinc-400 text-sm mt-1">Fui contratado e estou aguardando meu acesso.</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (userType === 'employee') {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-2xl text-center space-y-6 animate-in fade-in zoom-in">
                    <div className="mx-auto w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-purple-400" />
                    </div>

                    <h2 className="text-2xl font-bold text-white">Aguardando Convite</h2>

                    <div className="text-zinc-400 space-y-4">
                        <p>
                            Para acessar sua conta, você precisa ser convidado pelo administrador da sua empresa.
                        </p>
                        <p className="text-sm bg-black/30 p-3 rounded-lg border border-zinc-800 break-all">
                            Seu email: <span className="text-white font-mono">{userEmail}</span>
                        </p>
                        <p className="text-sm">
                            Peça para seu gestor enviar um convite para este email. Assim que ele fizer isso, atualize esta página.
                        </p>
                    </div>

                    <div className="space-y-3 pt-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-all"
                        >
                            Já fui convidado (Atualizar)
                        </button>
                        <button
                            onClick={handleBack}
                            className="w-full text-zinc-500 hover:text-white text-sm transition-colors"
                        >
                            Voltar / Sou Gestor
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Owner Flow (Existing Create Company)
    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl space-y-8">
                <div className="text-center">
                    <button
                        onClick={handleBack}
                        className="text-zinc-500 hover:text-white text-sm mb-4 flex items-center gap-2 mx-auto"
                    >
                        ← Voltar
                    </button>
                    <h1 className="text-3xl font-bold text-white mb-2">Criar Nova Empresa</h1>
                    <p className="text-zinc-400">Vamos preparar o ambiente administrativo.</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
                    {/* Progress */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className={`flex items-center gap-2 ${step === 1 ? 'text-blue-400' : 'text-zinc-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step === 1 ? 'border-blue-400 bg-blue-400/10' : 'border-zinc-700'}`}>1</div>
                            <span className="font-medium">Empresa</span>
                        </div>
                        <div className="h-px bg-zinc-800 flex-1" />
                        <div className={`flex items-center gap-2 ${step === 2 ? 'text-blue-400' : 'text-zinc-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step === 2 ? 'border-blue-400 bg-blue-400/10' : 'border-zinc-700'}`}>2</div>
                            <span className="font-medium">Equipe</span>
                        </div>
                    </div>

                    {step === 1 && (
                        <form onSubmit={handleCreateCompany} className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Nome da Empresa</label>
                                <div className="relative group">
                                    <Building2 className="absolute left-3 top-3 h-5 w-5 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full bg-black/40 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="Ex: Minha Loja Ltda"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Criar Empresa & Continuar'}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                <label className="text-sm font-medium text-zinc-300 block">Convide seus funcionários (Email)</label>
                                {employees.map((emp, index) => (
                                    <div key={index} className="flex gap-2">
                                        <div className="relative flex-1 group">
                                            <Users className="absolute left-3 top-3 h-5 w-5 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
                                            <input
                                                type="email"
                                                value={emp.email}
                                                onChange={(e) => handleEmployeeEmailChange(index, e.target.value)}
                                                className="w-full bg-black/40 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                placeholder="funcionario@email.com"
                                            />
                                        </div>
                                        {employees.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveEmployeeField(index)}
                                                className="p-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleAddEmployeeField}
                                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                                <Plus className="h-4 w-4" /> Adicionar outro
                            </button>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-xl transition-all"
                                >
                                    Pular por enquanto
                                </button>
                                <button
                                    onClick={handleInviteEmployees}
                                    disabled={loading}
                                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <>Concluir <Check className="h-4 w-4" /></>}
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-4 bg-red-500/10 text-red-200 rounded-xl text-sm border border-red-500/20">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
