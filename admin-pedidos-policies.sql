-- 1. Agrega un campo is_admin a la tabla de usuarios (si no existe)
-- (Solo si tienes una tabla propia de usuarios, no auth.users)
-- alter table public.users add column if not exists is_admin boolean default false;

-- 2. Política para que los administradores puedan ver todos los pedidos
create policy "Admins pueden ver todos los pedidos"
on public.pedidos
for select using (
  exists (
    select 1 from auth.users u
    where u.id = auth.uid() and (
      u.email = 'mision3d.cl@gmail.com' -- Cambia por el correo de admin
      or u.email = 'otroadmin@dominio.com'
    )
  )
  or auth.uid() = user_id
);

-- 3. (Opcional) Política para que los admins puedan actualizar pedidos
create policy "Admins pueden actualizar pedidos"
on public.pedidos
for update using (
  exists (
    select 1 from auth.users u
    where u.id = auth.uid() and (
      u.email = 'mision3d.cl@gmail.com' -- Cambia por el correo de admin
      or u.email = 'otroadmin@dominio.com'
    )
  )
);
