-- Quita el permiso de insertar leads con la clave pública: dejaba a los bots
-- escribir directamente en la tabla saltándose todo el antispam.
-- Desde que lead-chatbot.ts usa la clave de servicio ya no hace falta.
-- ESTADO: pendiente. Ejecutar DESPUÉS de fusionar a main y de que el
-- despliegue de producción haya terminado (si no, el chatbot de la web real
-- deja de poder guardar leads).
drop policy if exists "cualquiera crea lead" on public.leads;
