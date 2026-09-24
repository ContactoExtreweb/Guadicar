-- Quita el permiso de insertar leads con la clave pública: dejaba a los bots
-- escribir directamente en la tabla saltándose todo el antispam.
-- Desde que lead-chatbot.ts usa la clave de servicio ya no hace falta.
-- ESTADO: ejecutado el 24/09/2026, tras fusionar a main.
drop policy if exists "cualquiera crea lead" on public.leads;
