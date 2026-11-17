
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://roympuizrvsqilbrdrri.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_97vcVr1J3ZlWQzRhiUX2wg_buN3YO2U';

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);
