
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { MoreHorizontal, Shield, User as UserIcon, Building2 } from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row'] & {
    shifts?: { name: string } | null
}
type Shift = Database['public']['Tables']['shifts']['Row']

export default function EmployeesPage() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [shifts, setShifts] = useState<Shift[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [companyId, setCompanyId] = useState<string | null>(null)

    // Invite State
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteLoading, setInviteLoading] = useState(false)

    // Edit Form State
    const [formData, setFormData] = useState({
        role: 'employee' as 'admin' | 'employee' | 'manager',
        job_title: '',
        default_shift_id: ''
    })

    const supabase = createClient()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: myProfile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
        if (!myProfile?.company_id) return

        setCompanyId(myProfile.company_id)

        // Fetch Profiles
        const { data: profilesData } = await supabase
            .from('profiles')
            .select('*, shifts(name)')
            .eq('company_id', myProfile.company_id)
            .order('full_name')

        // Fetch Shifts for dropdown
        const { data: shiftsData } = await supabase
            .from('shifts')
            .select('*')
            .eq('company_id', myProfile.company_id)

        if (profilesData) setProfiles(profilesData as any)
        if (shiftsData) setShifts(shiftsData)
        setLoading(false)
    }

    const handleInvite = async () => {
        if (!inviteEmail || !companyId) return
        setInviteLoading(true)

        try {
            const { error } = await supabase
                .from('company_invites')
                .insert({
                    company_id: companyId,
                    email: inviteEmail,
                    role: 'employee'
                })

            if (error) throw error

            alert('Convite enviado com sucesso! O funcionário já pode criar a conta.')
            setInviteEmail('')
            setIsInviteModalOpen(false)
        } catch (err) {
            console.error(err)
            alert('Erro ao enviar convite. Verifique se o email já foi convidado.')
        } finally {
            setInviteLoading(false)
        }

    }

    const handleEdit = (profile: Profile) => {
        setEditingId(profile.id)
        setFormData({
            role: profile.role as 'admin' | 'employee' | 'manager',
            job_title: profile.job_title || '',
            default_shift_id: profile.default_shift_id || ''
        })
    }

    const handleSave = async (id: string) => {
        setLoading(true)
        const { error } = await supabase.from('profiles').update({
            role: formData.role,
            job_title: formData.job_title,
            default_shift_id: formData.default_shift_id || null
        }).eq('id', id)

        if (!error) {
            setEditingId(null)
            fetchData()
        } else {
            alert('Erro ao atualizar')
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Funcionários</h2>
                    <p className="text-zinc-400">Gerencie sua equipe e permissões.</p>
                </div>
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <UserIcon className="w-4 h-4" />
                    Adicionar Funcionário
                </button>
            </div>

            {/* Invite Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
                        <h3 className="text-xl font-bold text-white">Convidar Funcionário</h3>
                        <p className="text-sm text-zinc-400">
                            Digite o e-mail do funcionário. Ele será vinculado automaticamente a esta empresa ao criar a conta.
                        </p>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase">E-mail</label>
                            <input
                                type="email"
                                placeholder="exemplo@email.com"
                                className="w-full bg-black/40 border border-zinc-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setIsInviteModalOpen(false)}
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleInvite}
                                disabled={inviteLoading || !inviteEmail}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
                            >
                                {inviteLoading ? 'Enviando...' : 'Enviar Convite'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-zinc-400 border-b border-white/5">
                        <tr>
                            <th className="p-4 font-medium">Nome / Email</th>
                            <th className="p-4 font-medium">Cargo</th>
                            <th className="p-4 font-medium">Turno</th>
                            <th className="p-4 font-medium">Permissão</th>
                            <th className="p-4 font-medium text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {profiles.map((profile) => (
                            <tr key={profile.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                                            <UserIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{profile.full_name || 'Sem nome'}</div>
                                            <div className="text-xs text-zinc-500 truncate max-w-[150px]">{profile.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    {editingId === profile.id ? (
                                        <input
                                            className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white w-full"
                                            value={formData.job_title}
                                            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                                        />
                                    ) : (
                                        <span className="text-zinc-300">{profile.job_title || '-'}</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    {editingId === profile.id ? (
                                        <select
                                            className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white w-full"
                                            value={formData.default_shift_id}
                                            onChange={(e) => setFormData({ ...formData, default_shift_id: e.target.value })}
                                        >
                                            <option value="">Selecione...</option>
                                            {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    ) : (
                                        <span className="text-zinc-300">
                                            {profile.shifts?.name || 'Turno Padrão'}
                                        </span>
                                    )}
                                </td>
                                <td className="p-4">
                                    {editingId === profile.id ? (
                                        <select
                                            className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white w-full"
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                        >
                                            <option value="employee">Funcionário</option>
                                            <option value="manager">Gerente</option>
                                            <option value="admin">Administrador</option>
                                        </select>
                                    ) : (
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${profile.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {profile.role === 'admin' ? <Shield className="w-3 h-3" /> : profile.role === 'manager' ? <Building2 className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                                            {profile.role === 'admin' ? 'Admin' : profile.role === 'manager' ? 'Gerente' : 'Func.'}
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    {editingId === profile.id ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setEditingId(null)} className="text-zinc-500 hover:text-white text-sm">Cancelar</button>
                                            <button onClick={() => handleSave(profile.id)} className="text-blue-400 hover:text-blue-300 text-sm font-medium">Salvar</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => handleEdit(profile)} className="text-zinc-500 hover:text-white p-2">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}

                        {profiles.length === 0 && !loading && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-zinc-500">
                                    Nenhum funcionário encontrado na sua empresa.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
