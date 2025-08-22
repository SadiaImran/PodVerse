import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const getSupabaseAuthorizedtoken = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    const token =  session?.access_token;
    return token;
}