-- ==============================================================================
-- SCRIPT UNIVERSAL "TURBO" - ShiftControl V3
-- Objetivo: Sistema Blindado de Auto-Join com Auditoria e Tratamento de Dados
-- ==============================================================================

-- 1. LIMPEZA SEGURA (Clean Slate Clean)
-- Remove triggers antigas para recriar com a nova logica
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Limpa policies que podem estar conflitando
DROP POLICY IF EXISTS "Strict company view" ON public.companies;
DROP POLICY IF EXISTS "Strict company access" ON public.companies;
DROP POLICY IF EXISTS "Owners can update own company" ON public.companies;
DROP POLICY IF EXISTS "View profiles in same company" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile or Admin manage" ON public.profiles;

-- ==============================================================================
-- 2. TABELA DE AUDITORIA DE SISTEMA (Novo!)
-- ==============================================================================
-- Vamos registrar tudo o que acontece no sistema de convites para debug futuro.
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL, -- 'AUTO_JOIN', 'SIGNUP_NEW_OWNER', 'ERROR'
    user_id UUID NOT NULL,
    email TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permite que o sistema (Trigger) escreva aqui, mas ninguem leia via API (seguranca)
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

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
        SET status = 'accepted', 
            updated_at = now() -- Assumindo que pode ter essa coluna, senao ignora
        WHERE id = v_invite_record.id;

        -- Log de Auditoria
        INSERT INTO public.system_logs (event_type, user_id, email, details)
        VALUES ('AUTO_JOIN', NEW.id, v_user_email, jsonb_build_object(
            'company_id', v_company_id, 
            'role', v_target_role,
            'source', 'invite_match'
        ));

    ELSE
        -- [RAMO B]: NOVO DONO (Sem convite)
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
-- 4. POLÍTICAS DE SEGURANÇA BLINDADAS (RLS)
-- ==============================================================================

-- 4.1 EMPRESAS (Companies)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Select: Dono OU Funcionário VINCULADO
CREATE POLICY "Strict company view" ON public.companies
FOR SELECT USING (
    owner_id = auth.uid() 
    OR 
    id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Insert: Qualquer um autenticado pode criar 1 empresa
CREATE POLICY "Enable insert for authenticated users" ON public.companies
FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Update: APENAS o Dono original
CREATE POLICY "Owners can update own company" ON public.companies
FOR UPDATE USING (auth.uid() = owner_id);

-- 4.2 PERFIS (Profiles)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Select: Eu mesmo OU Colegas da mesma empresa (Isolamento de Tenant)
CREATE POLICY "View profiles in same company" ON public.profiles
FOR SELECT USING (
    (auth.uid() = id) 
    OR
    (
        company_id IS NOT NULL 
        AND 
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
);

-- Update: Eu mesmo (dados básicos) OU Admin da minha empresa
CREATE POLICY "Admin manage company profiles" ON public.profiles
FOR UPDATE USING (
    (auth.uid() = id)
    OR
    (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
        AND
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
);

-- 4.3 CONVITES (Invites)
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

-- Apenas Admins/Managers podem ver e criar convites para a própria empresa
CREATE POLICY "Admins manage invites" ON public.company_invites
FOR ALL USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

