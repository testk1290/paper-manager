'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusCircle, Settings, ScanLine } from 'lucide-react'

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        <Link 
          href="/dashboard" 
          className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 transition-colors"
        >
          <Home className={`w-6 h-6 mb-1 ${pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-[10px] ${pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>Home</span>
        </Link>
        <Link 
          href="/search" 
          className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 transition-colors"
        >
          <Search className={`w-6 h-6 mb-1 ${pathname === '/search' ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-[10px] ${pathname === '/search' ? 'text-primary' : 'text-muted-foreground'}`}>Search</span>
        </Link>
        <Link 
          href="/upload" 
          className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 transition-colors relative"
        >
          <div className="absolute -top-5 bg-primary text-primary-foreground p-3 rounded-full shadow-lg">
            <ScanLine className="w-8 h-8" />
          </div>
          <span className="text-[10px] text-muted-foreground mt-8">Add</span>
        </Link>
        <Link 
          href="/settings" 
          className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 transition-colors"
        >
          <Settings className={`w-6 h-6 mb-1 ${pathname === '/settings' ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-[10px] ${pathname === '/settings' ? 'text-primary' : 'text-muted-foreground'}`}>Settings</span>
        </Link>
      </div>
    </div>
  )
}
