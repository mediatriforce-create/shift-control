-- ==============================================================================
-- SCRIPT "NUCLEAR" - RESET TOTAL DO BANCO DE DADOS
-- Objetivo: Apagar todas as tabelas e recriá-las do ZERO com as regras corretas.
-- Use isso se os outros scripts falharem por causa de nomes de constraints.
-- ==============================================================================

-- 1. DESTRUIR TUDO (Cuidado: Apaga todos os dados!)
DROP TABLE IF EXISTS public.time_entries CASCADE;
DROP TABLE IF EXISTS public.shifts CASCADE;
DROP TABLE IF EXISTS public.company_invites CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.system_logs CASCADE;

-- 2. RECRIAR TABELAS NA ORDEM CERTA (Com DELETE CASCADE Embutido)

-- 2.1 Empresas (Sem dependências externas além do Owner)
CREATE TABLE public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    cnpj TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Se deletar user, deleta empresa
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 Perfis (Vinculados a empresas)
CREATE TABLE public.profiles (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY, -- Se deletar user, deleta perfil
    email TEXT,
    full_name TEXT,
    role TEXT CHECK (role IN ('owner', 'admin', 'manager', 'employee')),
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL, -- Se deletar empresa, perfil fica orfão (mas não apaga o user)
    avatar_url TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 2.3 Convites
CREATE TABLE public.company_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE, -- Se deletar empresa, apaga convites
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.4 Turnos (Escalas)
CREATE TABLE public.shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Se apagar perfil, apaga turnos
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.5 Ponto (Time Entries)
CREATE TABLE public.time_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Se apagar perfil, apaga ponto
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out TIMESTAMP WITH TIME ZONE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE, -- Opcional, bom ter
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.6 Auditoria
CREATE TABLE public.system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id UUID NOT NULL,
    email TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. HABILITAR RLS (Segurança) EM TUDO
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- FIM DA CRIAÇÃO DE ESTRUTURA
-- (Agora você deve rodar o SCRIPT_FINAL_COMPLETO.sql para recriar as triggers e policies, 
--  pois este script aqui só cuida das TABELAS e ESTRUTURA FÍSICA).
