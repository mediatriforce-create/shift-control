# Guia de Configuração do Banco de Dados (Supabase)

Você recebeu um arquivo SQL (`migration_manager_role.sql`) e precisa executá-lo para habilitar o cargo de **Gerente**.

## Passo a Passo

1. **Acesse o Painel do Supabase**:
   Vá para [https://supabase.com/dashboard/project/_/sql](https://supabase.com/dashboard/project/_/sql) (Selecione seu projeto).

2. **Abra o Editor SQL**:
   No menu lateral esquerdo, clique no ícone **SQL Editor** (parece um terminal `>_`).

3. **Crie uma Nova Consulta**:
   Clique em **+ New query** no canto superior esquerdo (ou em um botão verde "New query").

4. **Copie e Cole o Código**:
   Copie **TODO** o conteúdo do arquivo abaixo e cole na área de texto do editor do Supabase.

```sql
-- 1. ADICIONAR CARGO 'MANAGER' AO ENUM
-- Este bloco verifica se o valor 'manager' já existe antes de tentar adicionar
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'manager' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'manager';
  END IF;
END$$;

-- 2. ATUALIZAR PERMISSÕES (POLICIES)

-- Permitir que Gerentes visualizem e editem perfis (exceto configs da empresa)
DROP POLICY IF EXISTS "Admins manage company profiles" ON profiles;
DROP POLICY IF EXISTS "Admins/Managers manage company profiles" ON profiles;

CREATE POLICY "Admins/Managers manage company profiles"
ON profiles FOR ALL
TO authenticated
USING (
  company_id = get_my_company_id() 
  AND (
    (select role from profiles where id = auth.uid()) = 'admin' 
    OR 
    (select role from profiles where id = auth.uid()) = 'manager'
  )
);

-- Permitir que Gerentes gerenciem turnos
DROP POLICY IF EXISTS "Admins manage shifts" ON shifts;
DROP POLICY IF EXISTS "Admins/Managers manage shifts" ON shifts;

CREATE POLICY "Admins/Managers manage shifts"
ON shifts FOR ALL
TO authenticated
USING (
  company_id = get_my_company_id() 
  AND (
    (select role from profiles where id = auth.uid()) = 'admin' 
    OR 
    (select role from profiles where id = auth.uid()) = 'manager'
  )
);

-- Permitir que Gerentes gerenciem escalas
DROP POLICY IF EXISTS "Admins manage schedules" ON schedules;
DROP POLICY IF EXISTS "Admins/Managers manage schedules" ON schedules;

CREATE POLICY "Admins/Managers manage schedules"
ON schedules FOR ALL
TO authenticated
USING (
  company_id = get_my_company_id() 
  AND (
    (select role from profiles where id = auth.uid()) = 'admin' 
    OR 
    (select role from profiles where id = auth.uid()) = 'manager'
  )
);

-- Permitir que Gerentes vejam todos os pontos
DROP POLICY IF EXISTS "Admins view all time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins/Managers view all time entries" ON time_entries;

CREATE POLICY "Admins/Managers view all time entries"
ON time_entries FOR SELECT
TO authenticated
USING (
  company_id = get_my_company_id() 
  AND (
    (select role from profiles where id = auth.uid()) = 'admin' 
    OR 
    (select role from profiles where id = auth.uid()) = 'manager'
  )
);
```

5. **Execute**:
   Clique no botão **Run** (ou pressione `Ctrl + Enter` / `Cmd + Enter`).
   
   ✅ Se aparecer "Success" na parte inferior, deu certo! Agora o sistema aceita o cargo "Gerente" e aplica as permissões corretas.

6. **Passo 6: Lógica de Auto-Associação (Correção Definitiva 🚀)**
   Este script ativa a "Associação Automática". Se você adicionar o email de um funcionário no painel, quando ele criar conta, ele entra DIRETO na empresa, sem convite/link/espera.

   1. Copie o conteúdo ATUALIZADO do arquivo `SCRIPT_8_STRICT_INVITES.sql`.
   2. Cole no SQL Editor do Supabase.
   3. Clique em **Run**.
   4. Pronto! Agora o fluxo é: Adicionou Email -> Funcionário Cria Conta -> Entrou Sozinho.
