-- ==============================================================================
-- SCRIPT UNIVERSAL "TURBO" - ShiftControl V3 (COMPLETO E SEM CORTES)
-- Objetivo: Sistema Blindado de Auto-Join com Auditoria, RLS e Limpeza
-- ==============================================================================

-- 1. LIMPEZA SEGURA (Clean Slate Clean)
-- Remove triggers antigas para recriar com a nova logica
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Limpa policies que podem estar conflitando (Removemos TODAS para recriar do zero)
DROP POLICY IF EXISTS "Strict company view" ON public.companies;
DROP POLICY IF EXISTS "Strict company access" ON public.companies;
DROP POLICY IF EXISTS "Owners can update own company" ON public.companies;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.companies;
DROP POLICY IF EXISTS "View profiles in same company" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile or Admin manage" ON public.profiles;
DROP POLICY IF EXISTS "Admin manage company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage invites" ON public.company_invites;

-- ==============================================================================
-- 1.1 LIMPEZA DE DADOS (OPCIONAL - CUIDADO)
-- Descomente as linhas abaixo se quiser ZERAR o banco de dados para iniciar testes limpos
-- TRUNCATE TABLE public.time_entries CASCADE;
-- TRUNCATE TABLE public.shifts CASCADE;
-- TRUNCATE TABLE public.profiles CASCADE;
-- TRUNCATE TABLE public.companies CASCADE;
-- TRUNCATE TABLE public.company_invites CASCADE;
-- TRUNCATE TABLE public.system_logs CASCADE;

-- ==============================================================================
-- 2. TABELAS NECESSÁRIAS
-- ==============================================================================

-- 2.1 Tabela de Auditoria de Sistema (Novo!)
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL, -- 'AUTO_JOIN', 'SIGNUP_NEW_OWNER', 'ERROR'
    user_id UUID NOT NULL,
    email TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- 2.2 Tabela de Convites (Garantir Existência)
CREATE TABLE IF NOT EXISTS public.company_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    status TEXT DEFAULT 'pending', -- pending, accepted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_company_invites_email ON public.company_invites(email);

-- ==============================================================================
-- 3. FUNÇÃO AVANÇADA DE CRIAÇÃO DE USUÁRIO
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    -- Variáveis para processamento detalhado
    v_invite_record record;      -- Armazena dados do convite encontrado
    v_user_email TEXT;           -- Email normalizado
    v_user_name TEXT;            -- Nome extraido dos metadados
    v_user_avatar TEXT;          -- Avatar extraido
    v_company_id UUID;           -- ID da empresa destino
    v_target_role TEXT;          -- Cargo final do usuario
    v_signup_status TEXT;        -- Status inicial (active/pending)
    v_metadata JSONB;            -- Metadados brutos
BEGIN
    -- 1. Extração e Normalização de Dados
    v_user_email := NEW.email;
    v_metadata := NEW.raw_user_meta_data;
    
    -- Tenta extrair nome de varias fontes possiveis
    v_user_name := COALESCE(
        v_metadata->>'full_name', 
        v_metadata->>'name', 
        v_metadata->>'full_name_alias',
        split_part(v_user_email, '@', 1) -- Fallback para parte do email
    );
    
    v_user_avatar := v_metadata->>'avatar_url';

    -- 2. Busca Inteligente por Convite
    -- Procura na tabela de convites por este email
    SELECT * INTO v_invite_record 
    FROM public.company_invites 
    WHERE email = v_user_email 
    LIMIT 1;

    -- 3. Lógica de Decisão (Branching)
    IF v_invite_record IS NOT NULL THEN
        -- [RAMO A]: AUTO-JOIN (Usuario foi convidado)
        v_company_id := v_invite_record.company_id;
        v_target_role := v_invite_record.role; -- 'employee', 'manager', etc
        v_signup_status := 'active'; -- Entra ja ativo

        -- Insere Perfil Vinculado
        INSERT INTO public.profiles (
            id, 
            email, 
            role, 
            company_id, 
            full_name, 
            avatar_url,
            status,
            created_at
        )
        VALUES (
            NEW.id,
            v_user_email,
            v_target_role,
            v_company_id,
            v_user_name,
            v_user_avatar,
            v_signup_status,
            now()
        );

        -- Atualiza Convite para 'accepted'
        UPDATE public.company_invites 
        SET status = 'accepted'
        WHERE id = v_invite_record.id;

        -- Log de Auditoria
        INSERT INTO public.system_logs (event_type, user_id, email, details)
        VALUES ('AUTO_JOIN', NEW.id, v_user_email, jsonb_build_object(
            'company_id', v_company_id, 
            'role', v_target_role,
            'source', 'invite_match'
        ));

    ELSE
        -- [RAMO B]: NOVO USUÁRIO / POTENCIAL DONO (Sem convite)
        v_company_id := NULL;
        v_target_role := NULL; -- Será definido quando criar a empresa
        v_signup_status := 'pending';

        -- Insere Perfil Zerado
        INSERT INTO public.profiles (
            id, 
            email, 
            role, 
            company_id, 
            full_name, 
            avatar_url,
            status,
            created_at
        )
        VALUES (
            NEW.id,
            v_user_email,
            v_target_role,
            v_company_id,
            v_user_name,
            v_user_avatar,
            v_signup_status,
            now()
        );

        -- Log de Auditoria
        INSERT INTO public.system_logs (event_type, user_id, email, details)
        VALUES ('SIGNUP_NEW_USER', NEW.id, v_user_email, jsonb_build_object(
            'source', 'organic'
        ));

    END IF;

    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Tratamento de Erro Silencioso (Fail Open)
    -- Se der erro no trigger, logamos mas nao impedimos criar o user no Auth
    INSERT INTO public.system_logs (event_type, user_id, email, details)
    VALUES ('CRITICAL_ERROR', NEW.id, NEW.email, jsonb_build_object(
        'error', SQLERRM,
        'state', SQLSTATE
    ));
    -- Fallback: Cria perfil básico para nao quebrar login
    INSERT INTO public.profiles (id, email, full_name) 
    VALUES (NEW.id, NEW.email, 'Erro no Cadastro');
    
    RETURN NEW;
END;
$function$;

-- Trigger Principal
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. POLÍTICAS DE SEGURANÇA BLINDADAS (RLS) - SEM RECURSÃO INFINITA
-- ==============================================================================

-- 4.0 HELPER FUNCTIONS (Bypass RLS para evitar loops)
-- Estas funções rodam com permissão de SECURITY DEFINER (sudo) para ler dados sem triggerar policies.

-- Helper: Pegar ID da Empresa do Usuário
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Helper: Verificar se sou Owner/Admin/Manager
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('owner', 'admin', 'manager')
    );
$$;

-- 4.1 EMPRESAS (Companies)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Select: Dono OU Funcionário daquela empresa
CREATE POLICY "Strict company view" ON public.companies
FOR SELECT USING (
    owner_id = auth.uid() 
    OR 
    id = public.get_my_company_id()
);

-- Insert: Qualquer um autenticado pode criar (desde que seja owner)
CREATE POLICY "Enable insert for authenticated users" ON public.companies
FOR INSERT WITH CHECK (
    auth.uid() = owner_id
);

-- Update: APENAS o Dono original
CREATE POLICY "Owners can update own company" ON public.companies
FOR UPDATE USING (auth.uid() = owner_id);

-- 4.2 PERFIS (Profiles)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Select: Eu mesmo OU Colegas da mesma empresa
CREATE POLICY "View profiles in same company" ON public.profiles
FOR SELECT USING (
    (auth.uid() = id) 
    OR
    (company_id IS NOT NULL AND company_id = public.get_my_company_id())
);

-- Update: Eu mesmo (dados básicos) OU Admin da minha empresa
CREATE POLICY "Admin manage company profiles" ON public.profiles
FOR UPDATE USING (
    (auth.uid() = id)
    OR
    (
        public.is_admin_or_owner() = true
        AND
        company_id = public.get_my_company_id()
    )
);

-- 4.3 CONVITES (Invites)
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

-- Apenas Admins/Managers (pelo perfil) OU Dono da Empresa (direto na tabela companies)
CREATE POLICY "Admins manage invites" ON public.company_invites
FOR ALL USING (
    (
        company_id = public.get_my_company_id()
        AND
        public.is_admin_or_owner() = true
    )
    OR
    (
        EXISTS (
            SELECT 1 FROM public.companies 
            WHERE id = company_invites.company_id 
            AND owner_id = auth.uid()
        )
    )
);

-- 5. AJUSTES FINAIS DE TIPO
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
       ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
    END IF;
END$$;

-- 6. GARANTIA DE DELETE CASCADE (Para não travar deleção de users)
-- Recria as FKs principais com ON DELETE CASCADE
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey,
ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.companies
DROP CONSTRAINT IF EXISTS companies_owner_id_fkey,
ADD CONSTRAINT companies_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.company_invites
DROP CONSTRAINT IF EXISTS company_invites_company_id_fkey,
ADD CONSTRAINT company_invites_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
