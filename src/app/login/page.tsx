
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
    // Modes: 'selection', 'admin_login', 'employee_login'
    const [viewMode, setViewMode] = useState<'selection' | 'admin' | 'employee'>('selection')

    // Auth State
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const router = useRouter()
    const supabase = createClient()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccessMessage(null)

        try {
            if (viewMode === 'employee' && isSignUp) {
                // Employee Signup logic (Trigger handles linking)
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: `${location.origin}/auth/callback` },
                })
                if (error) throw error
                setSuccessMessage('Conta criada! Se seu email foi convidado, você já está na empresa.')
            } else if (viewMode === 'admin' && isSignUp) {
                // Admin Signup
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: `${location.origin}/auth/callback` },
                })
                if (error) throw error
                setSuccessMessage('Conta de Admin criada! Verifique seu email.')
            } else {
                // Login (Unified for now, RLS handles access)
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                router.push('/dashboard')
                router.refresh()
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao processar solicitação')
        } finally {
            setLoading(false)
        }
    }

    // Selection View
    if (viewMode === 'selection') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-4 relative overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full" />

                <div className="w-full max-w-4xl space-y-12 relative z-10">
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-500 to-purple-500 mb-6 shadow-2xl shadow-blue-500/20">
                            <Lock className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                            ShiftControl
                        </h1>
                        <p className="text-xl text-zinc-400">Como você deseja acessar?</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        <button
                            onClick={() => { setViewMode('admin'); setIsSignUp(false); setError(null); setSuccessMessage(null); }}
                            className="group relative p-8 bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-white/10 hover:border-blue-500/50 transition-all hover:bg-zinc-900/80 text-left space-y-4 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Lock className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Administrador</h3>
                                <p className="text-zinc-400 text-sm">Criar empresa, gerenciar equipe e turnos.</p>
                            </div>
                        </button>

                        <button
                            onClick={() => { setViewMode('employee'); setIsSignUp(false); setError(null); setSuccessMessage(null); }}
                            className="group relative p-8 bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-white/10 hover:border-purple-500/50 transition-all hover:bg-zinc-900/80 text-left space-y-4 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Mail className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Funcionário</h3>
                                <p className="text-zinc-400 text-sm">Ver minha escala e bater ponto.</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Login/Auth View (Shared Structure, customized text)
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-4 relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full" />

            <div className="w-full max-w-md space-y-8 relative z-10">
                <div className="text-center space-y-4">
                    <button onClick={() => { setViewMode('selection'); setError(null); setSuccessMessage(null); }} className="absolute left-0 top-0 text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
                        ← Voltar
                    </button>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-purple-500 mb-6 shadow-xl shadow-blue-500/20">
                        {viewMode === 'admin' ? <Lock className="w-8 h-8 text-white" /> : <Mail className="w-8 h-8 text-white" />}
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">
                        {viewMode === 'admin' ? 'Área do Gestor' : 'Área do Funcionário'}
                    </h1>
                    <p className="text-zinc-400">
                        {isSignUp
                            ? (viewMode === 'admin' ? 'Crie sua conta para configurar a empresa' : 'Crie sua senha de acesso')
                            : 'Entre com suas credenciais'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6 bg-zinc-900/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 ml-1">Email</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-400 transition-colors">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                    placeholder="seu@email.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 ml-1">Senha</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-400 transition-colors">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-200 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <span>✅</span> {successMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 group"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                {isSignUp ? 'Criar Conta' : 'Entrar'}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                    <div className="text-center pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignUp(!isSignUp)
                                setError(null)
                                setSuccessMessage(null)
                            }}
                            className="text-sm text-zinc-400 hover:text-white transition-colors underline"
                        >
                            {isSignUp ? 'Já tem conta? Faça login' : (viewMode === 'admin' ? 'Não tem empresa? Crie agora' : 'Primeiro acesso? Cadastre a senha')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
