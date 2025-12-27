-- ==============================================================================
-- SCRIPT DE CORREÇÃO: DELETE CASCADE
-- Objetivo: Permitir que ao deletar um Usuário ou Empresa, tudo seja apagado junto.
-- ==============================================================================

-- 1. Profiles (Quando auth.users é deletado -> deleta profile)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey,
ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 2. Companies (Quando owner (auth.users) é deletado -> deleta empresa)
-- Cuidado: Isso apaga a empresa inteira se o dono sair.
ALTER TABLE public.companies
DROP CONSTRAINT IF EXISTS companies_owner_id_fkey,
ADD CONSTRAINT companies_owner_id_fkey
    FOREIGN KEY (owner_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 3. Company Invites (Quando empresa é deletada -> deleta convites)
ALTER TABLE public.company_invites
DROP CONSTRAINT IF EXISTS company_invites_company_id_fkey,
ADD CONSTRAINT company_invites_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES public.companies(id)
    ON DELETE CASCADE;

-- 4. Shifts (Turnos) - Dependem da Empresa e do User
ALTER TABLE public.shifts
DROP CONSTRAINT IF EXISTS shifts_company_id_fkey,
ADD CONSTRAINT shifts_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES public.companies(id)
    ON DELETE CASCADE;

ALTER TABLE public.shifts
DROP CONSTRAINT IF EXISTS shifts_user_id_fkey,
ADD CONSTRAINT shifts_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- 5. Time Entries (Pontos) - Dependem do User
ALTER TABLE public.time_entries
DROP CONSTRAINT IF EXISTS time_entries_user_id_fkey,
ADD CONSTRAINT time_entries_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- 6. Time Entries - Dependem da Empresa (se houver fk direta)
-- Verificando se existe, se não existir, o comando abaixo falha mas não para o script se não tiver transação,
-- mas é melhor garantir. Normalmente time_entries liga ao user, e user liga a empresa.
