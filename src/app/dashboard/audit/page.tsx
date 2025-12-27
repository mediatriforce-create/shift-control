
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, User } from 'lucide-react'
import { Database } from '@/types/database'

type AuditLog = Database['public']['Tables']['audit_logs']['Row'] & {
    actor_name?: string // We might join this manually or just show ID for now if no profile relation
}

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchLogs()
    }, [])

    const fetchLogs = async () => {
        // RLS will ensure only Admins see this
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)

        if (data) {
            setLogs(data)
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white">Auditoria</h2>
                <p className="text-zinc-400">Histórico de alterações no sistema (últimos 50).</p>
            </div>

            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-zinc-500">Carregando logs...</div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500">
                        Nenhum registro de auditoria encontrado.
                        <br />
                        <span className="text-xs opacity-50">(Certifique-se que você é Admin e que os triggers estão ativos no banco)</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-zinc-400 border-b border-white/5">
                                <tr>
                                    <th className="p-4 whitespace-nowrap">Data / Hora</th>
                                    <th className="p-4">Ação</th>
                                    <th className="p-4">Tabela</th>
                                    <th className="p-4">Usuário (ActorID)</th>
                                    <th className="p-4">Detalhes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-zinc-300 whitespace-nowrap">
                                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase
                                        ${log.action === 'INSERT' ? 'bg-green-500/10 text-green-400' :
                                                    log.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-400' :
                                                        log.action === 'DELETE' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-500/10 text-zinc-400'}
                                    `}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono text-zinc-400">
                                            {log.target_table}
                                        </td>
                                        <td className="p-4 text-zinc-400 font-mono text-xs">
                                            {log.actor_id?.slice(0, 8)}...
                                        </td>
                                        <td className="p-4 text-zinc-500 max-w-xs truncate">
                                            {JSON.stringify(log.changes)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
