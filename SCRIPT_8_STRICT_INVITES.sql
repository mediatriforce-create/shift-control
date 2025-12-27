-- SCRIPT_8_STRICT_INVITES.sql
-- Objetivo: Garantir que se o email jÃ¡ foi convidado, o usuario entra direto na empresa.

-- 1. Tabela de Convites (garantir que existe e tem status)
CREATE TABLE IF NOT EXISTS public.company_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    status TEXT DEFAULT 'pending', -- pending, accepted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. FunÃ§Ã£o de Auto-AssociaÃ§Ã£o (Trigger ao criar usuario)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    invite_record record;
BEGIN
    -- Verifica se existe um convite para este email
    SELECT * INTO invite_record FROM public.company_invites WHERE email = NEW.email LIMIT 1;

    IF invite_record IS NOT NULL THEN
        -- CENÃRIO 1: USUÃRIO JÃ CONVIDADO (Auto-Join)
        -- Cria o perfil JÃ vinculado Ã  empresa e com o cargo definido no convite
        INSERT INTO public.profiles (id, email, role, company_id, full_name, status)
        VALUES (
            NEW.id,
            NEW.email,
            invite_record.role, -- Usa o cargo do convite (ex: manager ou employee)
            invite_record.company_id, -- Vincula AUTOMATICAMENTE a empresa
            COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
            'active' -- JÃ¡ entra ativo
        );

        -- (Opcional) Atualiza o status do convite para aceito
        UPDATE public.company_invites SET status = 'accepted' WHERE id = invite_record.id;
    ELSE
        -- CENÃRIO 2: USUÃRIO SEM CONVITE (Fluxo antigo ou Dono criando empresa)
        -- Cria perfil sem empresa (serÃ¡ dono ou aguardarÃ¡ convite depois)
        INSERT INTO public.profiles (id, email, role, company_id, full_name, status)
        VALUES (
            NEW.id,
            NEW.email,
            NULL,
            NULL,
            COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
            'pending'
        );
    END IF;

    RETURN NEW;
END;
$function$;

-- 3. Recriar a Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. PolÃ­ticas de SeguranÃ§a (RLS) ReforÃ§adas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Strict company access" ON public.companies;

CREATE POLICY "Strict company access" ON public.companies FOR SELECT
USING (
    owner_id = auth.uid()
    OR
    id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Owners can update own company"
ON public.companies
FOR UPDATE
USING ( owner_id = auth.uid() );

CREATE POLICY "Owners can delete own company"
ON public.companies
FOR DELETE
USING ( owner_id = auth.uid() );

-- Insert: Qualquer um autenticado pode criar UMA empresa (se não tiver outra, validado no front/trigger se quiser)
CREATE POLICY "Authenticated can create company"
ON public.companies
FOR INSERT
WITH CHECK ( owner_id = auth.uid() );

