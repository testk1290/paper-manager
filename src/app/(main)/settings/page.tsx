import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signout } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="p-4 sm:p-6 pb-20 max-w-2xl mx-auto space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </header>

      <section className="space-y-4">
        <div className="flex items-center gap-4 p-4 border rounded-xl bg-card">
          <div className="bg-primary/10 p-3 rounded-full">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-muted-foreground">Account</p>
            <p className="font-medium truncate">{user?.email}</p>
          </div>
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
