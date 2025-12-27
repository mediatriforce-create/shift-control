
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    format,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    isToday
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from 'lucide-react'

// Define types for joined data
type ScheduleWithShift = {
    id: string
    date: string
    is_day_off: boolean
    shift: {
        name: string
        start_time: string
        end_time: string
        is_night_shift: boolean
    } | null
}

export default function MySchedulePage() {
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
    const [currentDate, setCurrentDate] = useState(new Date())
    const [schedules, setSchedules] = useState<ScheduleWithShift[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchSchedules()
    }, [currentDate, viewMode])

    const fetchSchedules = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        let start, end

        if (viewMode === 'month') {
            start = startOfMonth(currentDate)
            end = endOfMonth(currentDate)
        } else {
            start = startOfWeek(currentDate, { locale: ptBR })
            end = endOfWeek(currentDate, { locale: ptBR })
        }

        // Adjust to string format YYYY-MM-DD
        const startStr = format(start, 'yyyy-MM-dd')
        const endStr = format(end, 'yyyy-MM-dd')

        const { data } = await supabase
            .from('schedules')
            .select(`
        id,
        date,
        is_day_off,
        shift:shifts (
          name,
          start_time,
          end_time,
          is_night_shift
        )
      `)
            .eq('user_id', user.id)
            .gte('date', startStr)
            .lte('date', endStr)

        if (data) {
            // Need to ensure type safety for the joined shift
            setSchedules(data as any[])
        }
        setLoading(false)
    }

    const handlePrevious = () => {
        if (viewMode === 'month') {
            setCurrentDate(subMonths(currentDate, 1))
        } else {
            setCurrentDate(subWeeks(currentDate, 1))
        }
    }

    const handleNext = () => {
        if (viewMode === 'month') {
            setCurrentDate(addMonths(currentDate, 1))
        } else {
            setCurrentDate(addWeeks(currentDate, 1))
        }
    }

    const days = eachDayOfInterval({
        start: viewMode === 'month' ? startOfMonth(currentDate) : startOfWeek(currentDate, { locale: ptBR }),
        end: viewMode === 'month' ? endOfMonth(currentDate) : endOfWeek(currentDate, { locale: ptBR })
    })

    // Helper to find schedule for a day
    const getScheduleForDay = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        return schedules.find(s => s.date === dayStr)
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Minha Escala</h2>
                    <p className="text-zinc-400">Visualize seus turnos e folgas.</p>
                </div>

                <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-xl self-start">
                    <button
                        onClick={() => setViewMode('month')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'month' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        Mensal
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                    >
                        <List className="w-4 h-4" />
                        Semanal
                    </button>
                </div>
            </header>

            {/* Calendar Controls */}
            <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                <button onClick={handlePrevious} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-semibold text-white capitalize">
                    {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </h3>
                <button onClick={handleNext} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Grid View (Month/Week) */}
            <div className={`grid gap-4 ${viewMode === 'month' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7' : 'grid-cols-1'}`}>
                {days.map((day) => {
                    const schedule = getScheduleForDay(day)
                    const isTodayDate = isToday(day)

                    return (
                        <div
                            key={day.toISOString()}
                            className={`
                        min-h-[120px] p-4 rounded-2xl border transition-all
                        ${isTodayDate ? 'bg-blue-900/10 border-blue-500/30' : 'bg-zinc-900/30 border-white/5 hover:border-white/10'}
                        ${viewMode === 'week' ? 'flex items-center justify-between min-h-[80px]' : 'flex flex-col'}
                    `}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className={`text-sm font-medium capitalize ${isTodayDate ? 'text-blue-400' : 'text-zinc-400'}`}>
                                    {format(day, 'EEE, dd', { locale: ptBR })}
                                </span>
                                {schedule?.is_day_off && (
                                    <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-full">
                                        Folga
                                    </span>
                                )}
                            </div>

                            <div className="flex-1">
                                {schedule?.shift ? (
                                    <div className="space-y-1">
                                        <div className="font-medium text-white text-sm">
                                            {schedule.shift.name}
                                        </div>
                                        <div className="text-xs text-zinc-500 font-mono">
                                            {schedule.shift.start_time.slice(0, 5)} - {schedule.shift.end_time.slice(0, 5)}
                                        </div>
                                        {schedule.shift.is_night_shift && (
                                            <div className="text-[10px] text-purple-400 mt-1">Noturno</div>
                                        )}
                                    </div>
                                ) : schedule?.is_day_off ? (
                                    <div className="flex items-center justify-center h-full text-zinc-600 text-sm italic">
                                        Dia livre
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                                        -
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
