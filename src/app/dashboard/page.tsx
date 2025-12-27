
'use client'

export default function DashboardPage() {
    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">Bem-vindo</h2>
                    <p className="text-zinc-400">Visão geral da sua operação hoje.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
                        <span className="text-sm font-medium">AD</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DashboardCard title="Funcionários Ativos" value="0" />
                <DashboardCard title="Turnos Hoje" value="0" />
                <DashboardCard title="Atrasos" value="0" />
            </div>
        </div>
    )
}

function DashboardCard({ title, value }: { title: string, value: string }) {
    return (
        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl hover:border-white/10 transition-colors">
            <h3 className="text-zinc-400 text-sm font-medium mb-2">{title}</h3>
            <p className="text-3xl font-bold text-white">{value}</p>
        </div>
    )
}
