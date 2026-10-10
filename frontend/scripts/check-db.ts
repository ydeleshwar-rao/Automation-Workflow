import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkJobs() {
  console.log('Checking serviceM8_jobs table...')
  const { data, error, count } = await supabase
    .from('serviceM8_jobs')
    .select('*', { count: 'exact' })
  
  if (error) {
    console.error('Error fetching jobs:', error)
    // Try lowercase
    console.log('Trying lowercase table name...')
    const { data: data2, error: error2, count: count2 } = await supabase
      .from('servicem8_jobs')
      .select('*', { count: 'exact' })
    
    if (error2) {
      console.error('Error fetching jobs (lowercase):', error2)
    } else {
      console.log(`Found ${count2} jobs in servicem8_jobs (lowercase)`)
      console.log('Sample job:', data2?.[0])
    }
  } else {
    console.log(`Found ${count} jobs in serviceM8_jobs (mixed case)`)
    console.log('Sample job:', data?.[0])
  }
}

checkJobs()
