require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function signInUser() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@sgie.com',
    password: 'Password123!',
  });
  
  if (error) {
    console.error("Erreur de connexion:", error.message);
  } else {
    console.log("Connexion réussie:", data.user?.email);
  }
}

signInUser();
