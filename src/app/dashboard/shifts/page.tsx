
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Clock } from 'lucide-react'
import { Database } from '@/types/database'

type Shift = Database['public']['Tables']['shifts']['Row']

export default function ShiftsPage() {
    const [shifts, setShifts] = useState<Shift[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        start_time: '08:00',
        end_time: '17:00',
        is_night_shift: false
    })

    const supabase = createClient()

    useEffect(() => {
        fetchShifts()
    }, [])

    const fetchShifts = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get company_id (assuming user has one)
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()

        if (profile?.company_id) {
            const { data } = await supabase
                .from('shifts')
                .select('*')
                .eq('company_id', profile.company_id)
                .order('name')

            if (data) setShifts(data)
        }
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza? Isso pode afetar usuários vinculados.')) return
        await supabase.from('shifts').delete().eq('id', id)
        fetchShifts()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single()

            if (!profile?.company_id) throw new Error('Sem empresa')

            const { error } = await supabase.from('shifts').insert({
                company_id: profile.company_id,
                name: formData.name,
                start_time: formData.start_time,
                end_time: formData.end_time,
                is_night_shift: formData.is_night_shift
            })

            if (error) throw error

            setShowModal(false)
            setFormData({ name: '', start_time: '08:00', end_time: '17:00', is_night_shift: false })
            fetchShifts()
        } catch (err) {
            alert('Erro ao criar turno')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Turnos de Trabalho</h2>
                    <p className="text-zinc-400">Gerencie os horários padrão da empresa.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Novo Turno
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shifts.map((shift) => (
                    <div key={shift.id} className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div className="bg-blue-500/10 text-blue-400 p-2 rounded-lg">
                                <Clock className="w-5 h-5" />
                            </div>
                            <button
                                onClick={() => handleDelete(shift.id)}
                                className="text-zinc-500 hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white">{shift.name}</h3>
                            <p className="text-zinc-400 font-mono mt-1">
                                {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                            </p>
                            {shift.is_night_shift && (
                                <span className="inline-block mt-2 text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded-md">
                                    Noturno
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-bold text-white">Novo Turno</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm text-zinc-400">Nome do Turno</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-zinc-800 border-white/10 rounded-lg p-2 text-white mt-1"
                                    placeholder="Ex: Comercial"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-zinc-400">Entrada</label>
                                    <input
                                        required
                                        type="time"
                                        className="w-full bg-zinc-800 border-white/10 rounded-lg p-2 text-white mt-1"
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400">Saída</label>
                                    <input
                                        required
                                        type="time"
                                        className="w-full bg-zinc-800 border-white/10 rounded-lg p-2 text-white mt-1"
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                    />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-zinc-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_night_shift}
                                    onChange={(e) => setFormData({ ...formData, is_night_shift: e.target.checked })}
                                    className="rounded bg-zinc-800 border-white/10"
                                />
                                Turno Noturno
                            </label>

                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-xl">Cancelar</button>
                                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl">Criar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
