-- Baja de la newsletter: token aleatorio por suscriptor para el enlace de
-- baja de los correos (ver src/pages/api/baja.js).
-- ESTADO: ejecutado el 24/09/2026.
alter table public.suscriptores
  add column if not exists token_baja uuid not null default gen_random_uuid();
create unique index if not exists suscriptores_token_baja_key
  on public.suscriptores (token_baja);
