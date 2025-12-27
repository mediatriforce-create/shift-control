# Guia de Deploy - ShiftControl

## 1. Banco de Dados (Supabase)
Como você já rodou o `SCRIPT_FINAL_COMPLETO.sql`, seu banco de dados está pronto!
Certifique-se de que a URL e a KEY do Supabase adicionadas no Vercel sejam as mesmas do seu projeto.

## 2. Código (GitHub)
Siga estes passos para subir o código para o GitHub:

1.  Crie um novo repositório no GitHub (ex: `shift-control`).
2.  Abra o terminal na pasta do projeto e rode:
    ```bash
    git init
    git add .
    git commit -m "Initial commit: ShiftControl v1.0"
    git branch -M main
    git remote add origin https://github.com/SEU_USUARIO/shift-control.git
    git push -u origin main
    ```

## 3. Hospedagem (Vercel)
1.  Crie uma conta na Vercel (se não tiver).
2.  Clique em **"Add New..."** -> **Project**.
3.  Importe o repositório `shift-control` do seu GitHub.
4.  **Variáveis de Ambiente**:
    Na tela de configuração do deploy, adicione as variáveis:
    *   `NEXT_PUBLIC_SUPABASE_URL`: (Sua URL do Supabase)
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Sua Key Anon do Supabase)
5.  Clique em **Deploy**.

## Funcionalidades Prontas (Checklist)
*   [x] **Login Separado**: Admin vs Funcionário.
*   [x] **Cadastro de Empresa**: Fluxo de Setup para Admin.
*   [x] **Adicionar Funcionários**:
    *   Vá em Dashboard > Funcionários.
    *   Use o botão **"Adicionar Funcionário"** para convidar por e-mail.
*   [x] **Vínculo Automático**:
    *   Quando o funcionário criar a conta com o e-mail convidado (na aba "Funcionário"), ele entrará automaticamente na sua empresa.
*   [x] **Definir Turnos**:
    *   Crie os turnos na aba "Turnos".
    *   Na aba "Funcionários", clique em "Editar" (três pontinhos) para atribuir o turno ao funcionário.
