import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Shield } from 'lucide-react'
import { AdminPasswordResetForm } from './admin-password-reset-form'
import { supabaseAdmin } from '@/lib/supabase/admin'

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/login')
  }

  const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : []
  if (!adminEmails.includes(user.email)) {
    redirect('/')
  }

  // Fetch all users using admin client
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()

  return (
    <div className="p-4 sm:p-6 pb-20 max-w-4xl mx-auto space-y-6">
      <header className="flex items-center gap-3 mb-6">
        <div className="bg-primary/10 p-2 rounded-full">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">User Management</h2>
        {error ? (
          <p className="text-red-500 p-4 bg-red-50 rounded-md">Failed to load users: {error.message}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {users.map((u) => (
              <div key={u.id} className="p-4 border rounded-xl bg-card space-y-4">
                <div>
                  <p className="font-medium truncate" title={u.email}>{u.email}</p>
                  <p className="text-xs text-muted-foreground">ID: {u.id}</p>
                </div>
                <AdminPasswordResetForm userId={u.id} userEmail={u.email!} />
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-muted-foreground">No users found.</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
