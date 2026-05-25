import { createClient } from '@supabase/supabase-js';

// Cliente SOLO para el servidor (endpoints /api). Usa la service_role,
// que es secreta y nunca debe llegar al navegador.
export const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);