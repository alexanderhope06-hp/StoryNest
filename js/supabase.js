/* =====================================================
   STORYNEST - SUPABASE CONNECTION
   ===================================================== */

const SUPABASE_URL =
    "https://frtvsuxvhvnjrrffyeot.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_11ENpggEwgjSV4z-vcD-nw_IEoM86Bc";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );