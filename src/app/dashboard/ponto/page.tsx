
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function PontoPage() {
    const [loading, setLoading] = useState(false)
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [currentTime, setCurrentTime] = useState(new Date())

    const supabase = createClient()

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const getLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocalização não suportada pelo seu navegador')
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                })
                setError(null)
            },
            (err) => {
                setError('Permissão de localização negada ou indisponível')
            }
        )
    }

    // Get location on mount
    useEffect(() => {
        getLocation()
    }, [])

    const handlePunch = async (type: 'entry' | 'exit') => {
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuário não autenticado')

            // 1. Get user profile to find company_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single()

            if (!profile?.company_id) throw new Error('Empresa não encontrada para este usuário')

            // 2. Insert time entry
            const { error: insertError } = await supabase
                .from('time_entries')
                .insert({
                    company_id: profile.company_id,
                    user_id: user.id,
                    type: type,
                    location: location ? { lat: location.lat, lng: location.lng } : null
                })

            if (insertError) throw insertError

            setSuccess(`Ponto de ${type === 'entry' ? 'ENTRADA' : 'SAÍDA'} registrado com sucesso!`)
        } catch (err: any) {
            setError(err.message || 'Erro ao registrar ponto')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-white">Registro de Ponto</h2>
                <p className="text-zinc-400">
                    {format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
            </div>

            {/* Clock Display */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-12 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

                <div className="text-6xl md:text-8xl font-mono font-bold tracking-wider text-white mb-4 relative z-10">
                    {format(currentTime, 'HH:mm:ss')}
                </div>

                <div className="flex items-center gap-2 text-zinc-500 bg-black/20 px-4 py-2 rounded-full relative z-10">
                    <MapPin className={`w-4 h-4 ${location ? 'text-green-500' : 'text-red-500'}`} />
                    <span className="text-sm">
                        {location ? 'Localização Ativa' : 'Buscando GPS...'}
                    </span>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => handlePunch('entry')}
                    disabled={loading || !location}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-semibold py-8 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-900/20 flex flex-col items-center gap-2"
                >
                    <Clock className="w-8 h-8" />
                    REGISTRAR ENTRADA
                </button>

                <button
                    onClick={() => handlePunch('exit')}
                    disabled={loading || !location}
                    className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-semibold py-8 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-900/20 flex flex-col items-center gap-2"
                >
                    <LogMyOutIcon className="w-8 h-8" />
                    REGISTRAR SAÍDA
                </button>
            </div>

            {/* Feedback Messages */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-200 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    {success}
                </div>
            )}
        </div>
    )
}

function LogMyOutIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
    )
}
