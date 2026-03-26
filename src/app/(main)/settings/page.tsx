import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signout } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { LogOut, User, Shield } from 'lucide-react'
import { PasswordForm } from './password-form'
import Link from 'next/link'

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : []
  const isAdmin = user?.email && adminEmails.includes(user.email)

  return (
    <div className="p-4 sm:p-6 pb-20 max-w-2xl mx-auto space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </header>

      <section className="space-y-4">
        {isAdmin && (
          <Link href="/admin" className="block">
            <div className="flex items-center gap-4 p-4 border border-primary/20 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors">
              <div className="bg-primary/20 p-3 rounded-full">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-primary">Admin Dashboard</p>
                <p className="text-sm text-muted-foreground">Manage users and settings</p>
              </div>
            </div>
          </Link>
        )}

        <div className="flex items-center gap-4 p-4 border rounded-xl bg-card">
          <div className="bg-primary/10 p-3 rounded-full">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-muted-foreground">Account</p>
            <p className="font-medium truncate">{user?.email}</p>
          </div>
        </div>

        <div className="p-4 border rounded-xl bg-card space-y-4">
          <h2 className="text-lg font-semibold">Change Password</h2>
          <PasswordForm />
        </div>

        <div className="pt-4">
          <form action={signout}>
            <Button variant="destructive" className="w-full" size="lg">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
