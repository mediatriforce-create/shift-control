
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            companies: {
                Row: {
                    id: string
                    name: string
                    cnpj: string | null
                    status: 'active' | 'inactive' | null
                    owner_id: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    cnpj?: string | null
                    status?: 'active' | 'inactive' | null
                    owner_id?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    cnpj?: string | null
                    status?: 'active' | 'inactive' | null
                    owner_id?: string | null
                    created_at?: string | null
                }
            }
            profiles: {
                Row: {
                    id: string
                    company_id: string | null
                    email: string | null
                    role: 'admin' | 'employee' | 'viewer' | 'manager' | 'manager'
                    full_name: string | null
                    job_title: string | null
                    gender: string | null
                    avatar_url: string | null
                    default_shift_id: string | null
                    status: string
                    created_at: string
                }
                Insert: {
                    id: string
                    company_id?: string | null
                    email?: string | null
                    role?: 'admin' | 'employee' | 'viewer' | 'manager'
                    full_name?: string | null
                    job_title?: string | null
                    gender?: string | null
                    avatar_url?: string | null
                    default_shift_id?: string | null
                    status?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    company_id?: string | null
                    email?: string | null
                    role?: 'admin' | 'employee' | 'viewer' | 'manager'
                    full_name?: string | null
                    job_title?: string | null
                    gender?: string | null
                    avatar_url?: string | null
                    default_shift_id?: string | null
                    status?: string
                    created_at?: string
                }
            }
            shifts: {
                Row: {
                    id: string
                    company_id: string
                    name: string
                    start_time: string
                    end_time: string
                    break_duration: string | null
                    is_night_shift: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    company_id: string
                    name: string
                    start_time: string
                    end_time: string
                    break_duration?: string | null
                    is_night_shift?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    company_id?: string
                    name?: string
                    start_time?: string
                    end_time?: string
                    break_duration?: string | null
                    is_night_shift?: boolean
                    created_at?: string
                }
            }
            time_entries: {
                Row: {
                    id: string
                    company_id: string
                    user_id: string
                    timestamp: string
                    type: 'entry' | 'exit'
                    location: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    company_id: string
                    user_id: string
                    timestamp?: string
                    type: 'entry' | 'exit'
                    location?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    company_id?: string
                    user_id?: string
                    timestamp?: string
                    type?: 'entry' | 'exit'
                    location?: Json | null
                    created_at?: string
                }
            },
            audit_logs: {
                Row: {
                    id: string
                    company_id: string | null
                    actor_id: string | null
                    action: string
                    target_table: string
                    target_id: string | null
                    changes: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    company_id?: string | null
                    actor_id?: string | null
                    action: string
                    target_table: string
                    target_id?: string | null
                    changes?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    company_id?: string | null
                    actor_id?: string | null
                    action?: string
                    target_table?: string
                    target_id?: string | null
                    changes?: Json | null
                    created_at?: string
                }
            },
            company_invites: {
                Row: {
                    id: string
                    company_id: string
                    email: string
                    role: string
                    status: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    company_id: string
                    email: string
                    role?: string
                    status?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    company_id?: string
                    email?: string
                    role?: string
                    status?: string | null
                    created_at?: string
                }
            }
        }
    }
}
