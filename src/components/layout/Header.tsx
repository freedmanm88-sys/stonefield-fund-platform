'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface HeaderProps {
  userEmail: string
  userName: string
}

const mobileNav = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Investors', href: '/dashboard/investors' },
  { name: 'Accounts', href: '/dashboard/accounts' },
  { name: 'Ledger', href: '/dashboard/ledger', comingSoon: true },
  { name: 'Transactions', href: '/dashboard/transactions', comingSoon: true },
  { name: 'Calculations', href: '/dashboard/calculations', comingSoon: true },
  { name: 'PAD Files', href: '/dashboard/pad-files', comingSoon: true },
  { name: 'Reports', href: '/dashboard/reports', comingSoon: true },
  { name: 'Reconciliation', href: '/dashboard/reconciliation', comingSoon: true },
  { name: 'Expenses', href: '/dashboard/expenses', comingSoon: true },
  { name: 'Settings', href: '/dashboard/settings', comingSoon: true },
]

export default function Header({ userEmail, userName }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Mobile menu button */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-blue rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">SC</span>
          </div>
          <span className="text-sm font-semibold text-brand-black">Stonefield</span>
        </div>

        {/* Spacer for desktop */}
        <div className="hidden lg:block" />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-blue-light text-brand-blue flex items-center justify-center text-sm font-semibold">
              {userName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="hidden sm:block text-sm text-gray-700">{userName}</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile navigation */}
      {showMobileMenu && (
        <div className="lg:hidden border-t border-gray-200 bg-white max-h-[70vh] overflow-y-auto">
          <nav className="px-4 py-2 space-y-1">
            {mobileNav.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))

              if (item.comingSoon) {
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 cursor-not-allowed"
                  >
                    <span>{item.name}</span>
                    <span className="text-[10px] font-medium bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Soon</span>
                  </div>
                )
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setShowMobileMenu(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-brand-blue-light text-brand-blue'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
