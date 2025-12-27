# ShiftControl 🚀

Sistema SaaS de gestão de escalas de trabalho, turnos e ponto eletrônico para múltiplas empresas.

## Funcionalidades

- **Multi-tenancy**: Dados isolados por empresa via RLS (Row Level Security).
- **Controle de Acesso**:
    - **Admin**: Gestão total (Turnos, Funcionários, Escalas, Auditoria).
    - **Gerente**: Gestão operacional (Escalas, Turnos).
    - **Funcionário**: Visualização de escala e registro de ponto.
- **Ponto com Geolocalização**: Registro de entrada/saída com captura de coordenadas.
- **Escalas Flexíveis**: Visão mensal e semanal.
- **Auditoria**: Log completo de ações no sistema.

## Tecnologias

- **Frontend**: Next.js 14 (App Router), TailwindCSS, Lucide React.
- **Backend/Auth**: Supabase (Auth, Postgres, RLS).
- **Tipagem**: TypeScript.

## Configuração Local

1.  Clone o repositório.
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Crie um arquivo `.env.local` na raiz com suas chaves do Supabase:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
    NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
    ```
4.  Rode o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```

## Banco de Dados (Supabase)

O esquema do banco de dados está disponível em `schema.sql`.
Para habilitar o cargo de **Gerente**, execute o script `migration_manager_role.sql` no SQL Editor do Supabase.

## Deploy na Vercel

Este projeto está pronto para ser implantado na Vercel.

1.  Instale a CLI da Vercel (opcional) ou conecte seu repositório GitHub no painel da Vercel.
2.  Importe o projeto.
3.  Adicione as variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL`, etc.) nas configurações do projeto na Vercel.
4.  Clique em **Deploy**.

Ou via terminal:
```bash
npx vercel
```
