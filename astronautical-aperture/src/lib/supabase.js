import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.PUBLIC_SUPABASE_URL
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

if (!url || !key)
  throw new Error(
    'Faltan PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY en el .env',
  )

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
})
