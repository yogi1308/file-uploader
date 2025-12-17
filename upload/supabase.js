const {createClient} = require('@supabase/supabase-js')

// Create Supabase client
const supabase = createClient(SUPABASE_PROJECT_URL, process.env.SUPABASE_KEY)

// Upload file using standard upload
async function uploadFile(file) {
  const { data, error } = await supabase.storage.from('bucket_name').upload('file_path', file)
  if (error) {
    console.log(error)
  } else {
    console.log("success")
  }
}

module.exports = uploadFile