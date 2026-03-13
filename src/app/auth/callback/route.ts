import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Ensure user record exists in public.users
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (!existingUser) {
          await supabase.from('users').insert({
            auth_id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
            role: 'team_member',
          })
        }

        // Update last login
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('auth_id', user.id)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
