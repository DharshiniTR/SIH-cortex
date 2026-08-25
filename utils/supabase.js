const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

let supabase = null

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project-id') && !supabaseUrl.includes('your-supabase-url')) {
  supabase = createClient(supabaseUrl, supabaseKey)
  console.log('Supabase client initialized successfully.')
} else {
  console.warn('⚠️ Supabase credentials not configured in .env file!')
  console.warn('Please add SUPABASE_URL and SUPABASE_KEY to your .env file.')
}

module.exports = { supabase }
