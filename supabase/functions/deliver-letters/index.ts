import { createClient } from 'npm:@supabase/supabase-js@2.116.0'

// This function has a dedicated scheduler secret. Never expose these secrets through VITE_*.
Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const cronSecret = Deno.env.get('CRONEVIA_CRON_SECRET')
  if (!cronSecret || request.headers.get('Authorization') !== `Bearer ${cronSecret}`) return new Response('Unauthorized', { status: 401 })
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('LETTERS_FROM_EMAIL')
  if (!apiKey || !from) return new Response('Email delivery is not configured', { status: 503 })
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: letters, error } = await client.rpc('claim_due_letters')
  if (error) return Response.json({ error: 'Unable to claim due letters' }, { status: 500 })
  let sent = 0, failed = 0
  for (const letter of letters || []) {
    try {
      const { data, error: userError } = await client.auth.admin.getUserById(letter.user_id)
      if (userError || !data.user?.email || !data.user.email_confirmed_at) throw new Error('Recipient email is not confirmed')
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `future-letter/${letter.id}` },
        body: JSON.stringify({ from, to: [data.user.email], subject: letter.subject, text: letter.body }),
        signal: AbortSignal.timeout(20000),
      })
      if (!response.ok) throw new Error(`Email provider returned ${response.status}`)
      const update = await client.from('future_letters').update({ sent_at: new Date().toISOString(), delivery_error: null }).eq('id', letter.id)
      if (update.error) throw new Error('Email accepted but delivery status could not be saved')
      sent++
    } catch (error) {
      failed++
      await client.from('future_letters').update({ delivery_error: error instanceof Error ? error.message : 'Delivery failed' }).eq('id', letter.id)
    }
  }
  return Response.json({ sent, failed })
})
