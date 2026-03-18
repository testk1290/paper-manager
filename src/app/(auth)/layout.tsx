import { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm bg-card border rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col items-center">
        {children}
      </div>
    </div>
  )
}
