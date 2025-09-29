import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // PAUSED: Admin account creation is currently disabled
  return new Response(
    JSON.stringify({ 
      error: 'Admin account creation is currently paused',
      message: 'New admin account creation has been temporarily disabled by the system administrator.'
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 503, // Service Unavailable
    }
  )

  /* ORIGINAL CODE - COMMENTED OUT FOR PAUSE
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Verify the requesting user is an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Only admins can create admin accounts' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    const { email, password, fullName } = await req.json()

    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and full name are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Create the admin user - the handle_new_user trigger will automatically
    // create the profile and assign the role based on user_metadata
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: fullName,
        role: 'admin'
      },
      email_confirm: true
    })

    if (createError) {
      // Handle specific error cases
      if (createError.message?.includes('User already registered')) {
        return new Response(
          JSON.stringify({ error: 'A user with this email address already exists' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409,
          }
        )
      }
      
      console.error('User creation error:', createError)
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${createError.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // The handle_new_user trigger automatically creates the profile and assigns the role
    // No need to manually insert into profiles or user_roles tables

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name: fullName,
          role: 'admin'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating admin account:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
   */

   /* COMMENTED OUT CODE CONTINUES HERE - TO RE-ENABLE, REMOVE THE PAUSE BLOCK ABOVE AND UNCOMMENT THIS SECTION */
})