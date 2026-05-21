## Plano

1. Executar script Node usando a service role key para criar o utilizador via Supabase Admin API:
   - email: `info@prism.pt`
   - password: `#Jdl3003869_`
   - `email_confirm: true` (já confirmado, pode entrar de imediato)
   - metadata: `full_name: "PRISM Admin"`

2. Inserir registo em `public.user_roles` com `role = 'manager'` para o `user_id` retornado.

3. Atualizar/garantir `public.profiles` (criado automaticamente pelo trigger `handle_new_user`) com `initials = 'ADM'`, `role = 'manager'`.

4. Verificar com `SELECT` que o utilizador existe em `auth.users`, tem role `manager` em `user_roles` e profile correto.

Após implementação poderá fazer login em `/login` com essas credenciais e aceder a todos os módulos de manager.