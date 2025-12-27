'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { MoreHorizontal, Shield, User as UserIcon, Building2, Trash2 } from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row'] & {
    shifts?: { name: string } | null
}
type Shift = Database['public']['Tables']['shifts']['Row']
type Invite = Database['public']['Tables']['company_invites']['Row']

export default function EmployeesPage() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [shifts, setShifts] = useState<Shift[]>([])
    const [invites, setInvites] = useState<Invite[]>([])

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
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: myProfile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
            if (!myProfile?.company_id) return

            setCompanyId(myProfile.company_id)

            // 1. Fetch Profiles
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('*, shifts(name)')
                .eq('company_id', myProfile.company_id)
                .order('full_name')

            // 2. Fetch Pending Invites
            const { data: invitesData } = await supabase
                .from('company_invites')
                .select('*')
                .eq('company_id', myProfile.company_id)
                .eq('status', 'pending')

            // 3. Fetch Shifts for dropdown
            const { data: shiftsData } = await supabase
                .from('shifts')
                .select('*')
                .eq('company_id', myProfile.company_id)

            if (profilesData) setProfiles(profilesData as any)
            if (invitesData) setInvites(invitesData)
            if (shiftsData) setShifts(shiftsData)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleInvite = async () => {
        if (!inviteEmail || !companyId) return
        setInviteLoading(true)

        try {
            const { error } = await supabase
                .from('company_invites')
                .insert({
                    company_id: companyId,
                    email: inviteEmail.trim(), // Remove spaces
                    role: 'employee',
                    status: 'pending'
                })

            if (error) throw error

            alert('Convite enviado com sucesso! O funcionário aparecerá como Pendente.')
            setInviteEmail('')
            setIsInviteModalOpen(false)
            fetchData() // Refresh list
        } catch (err: any) {
            console.error(err)
            alert('Erro ao enviar convite: ' + err.message)
        } finally {
            setInviteLoading(false)
        }
    }

    const handleDeleteInvite = async (inviteId: string) => {
        if (!confirm('Tem certeza que deseja cancelar este convite?')) return

        const { error } = await supabase
            .from('company_invites')
            .delete()
            .eq('id', inviteId)

        if (!error) {
            fetchData()
        } else {
            alert('Erro ao cancelar convite')
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
                    <p className="text-zinc-400">Gerencie sua equipe, turnos e convites.</p>
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
                    <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-xl font-bold text-white">Convidar Funcionário</h3>
                        <p className="text-sm text-zinc-400">
                            Digite o e-mail do funcionário. Ele aparecerá na lista como "Pendente" até criar a conta.
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

            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-zinc-400 border-b border-white/5">
                        <tr>
                            <th className="p-4 font-medium pl-6">Nome / Email</th>
                            <th className="p-4 font-medium">Cargo</th>
                            <th className="p-4 font-medium">Turno</th>
                            <th className="p-4 font-medium">Status / Permissão</th>
                            <th className="p-4 font-medium text-right pr-6">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {/* 1. Pending Invites */}
                        {invites.map((invite) => (
                            <tr key={'invite-' + invite.id} className="bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors border-l-2 border-yellow-500/50">
                                <td className="p-4 pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0">
                                            <UserIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-zinc-200">{invite.email}</div>
                                            <div className="text-xs text-yellow-500/80 font-medium">Convite Pendente</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-zinc-600">-</td>
                                <td className="p-4 text-zinc-600">-</td>
                                <td className="p-4">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                        Aguardando Cadastro
                                    </span>
                                </td>
                                <td className="p-4 text-right pr-6">
                                    <button
                                        onClick={() => handleDeleteInvite(invite.id)}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded-lg transition-colors"
                                        title="Cancelar Convite"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {/* 2. Active Profiles */}
                        {profiles.map((profile) => (
                            <tr key={profile.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                                            <UserIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{profile.full_name || 'Sem nome definido'}</div>
                                            <div className="text-xs text-zinc-500 truncate max-w-[200px]">{profile.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    {editingId === profile.id ? (
                                        <input
                                            className="bg-black/40 border border-white/10 rounded px-3 py-1.5 text-white w-full text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                            value={formData.job_title}
                                            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                                            placeholder="Ex: Vendedor"
                                        />
                                    ) : (
                                        <span className="text-zinc-300 text-sm">{profile.job_title || '-'}</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    {editingId === profile.id ? (
                                        <select
                                            className="bg-black/40 border border-white/10 rounded px-3 py-1.5 text-white w-full text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                            value={formData.default_shift_id}
                                            onChange={(e) => setFormData({ ...formData, default_shift_id: e.target.value })}
                                        >
                                            <option value="">Sem turno (Padrão)</option>
                                            {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    ) : (
                                        <span className={`text-sm font-medium ${profile.shifts?.name ? 'text-green-400' : 'text-zinc-500'}`}>
                                            {profile.shifts?.name || 'Sem turno definido'}
                                        </span>
                                    )}
                                </td>
                                <td className="p-4">
                                    {editingId === profile.id ? (
                                        <select
                                            className="bg-black/40 border border-white/10 rounded px-3 py-1.5 text-white w-full text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                        >
                                            <option value="employee">Funcionário</option>
                                            <option value="manager">Gerente</option>
                                            <option value="admin">Administrador</option>
                                        </select>
                                    ) : (
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${profile.role === 'admin'
                                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                : profile.role === 'manager'
                                                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                            {profile.role === 'admin' ? <Shield className="w-3 h-3" /> : profile.role === 'manager' ? <Building2 className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                                            {profile.role === 'admin' ? 'Admin' : profile.role === 'manager' ? 'Gerente' : 'Func.'}
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-right pr-6">
                                    {editingId === profile.id ? (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="px-3 py-1.5 text-zinc-400 hover:text-white text-sm transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={() => handleSave(profile.id)}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Salvar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleEdit(profile)}
                                            className="text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 px-3 py-1.5 rounded-lg text-sm transition-all border border-transparent hover:border-blue-500/20 flex items-center gap-2 ml-auto"
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                            <span>Editar / Turno</span>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}

                        {profiles.length === 0 && invites.length === 0 && !loading && (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-zinc-500">
                                    <UserIcon className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                                    <p className="text-lg font-medium text-zinc-400">Sua equipe está vazia</p>
                                    <p className="text-sm">Comece convidando seus funcionários acima.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
