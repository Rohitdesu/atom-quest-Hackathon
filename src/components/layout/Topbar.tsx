import { Search, LogOut, ChevronDown, Moon, Sun } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import NotificationCenter from "@/components/ui/NotificationCenter"
import { useTheme } from "@/contexts/ThemeContext"
import { supabase } from "@/lib/supabase"

export default function Topbar() {
  const { profile, signOut } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<{ goals: any[], users: any[] }>({ goals: [], users: [] })

  useEffect(() => {
    if (searchQuery.length <= 1) {
      setSearchResults({ goals: [], users: [] })
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const [goalsRes, usersRes] = await Promise.all([
          supabase.from('goals').select('id, title, thrust_area').ilike('title', `%${searchQuery}%`).limit(5),
          supabase.from('users').select('id, full_name, role').ilike('full_name', `%${searchQuery}%`).limit(5)
        ])
        
        setSearchResults({
          goals: goalsRes.data || [],
          users: usersRes.data || []
        })
      } catch (e) {
        console.error(e)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const roleLabel = profile?.role === 'admin'
    ? 'Administrator'
    : profile?.role === 'manager'
    ? 'Team Manager'
    : 'Employee'

  const roleColor = profile?.role === 'admin'
    ? 'text-rose-600 bg-rose-50'
    : profile?.role === 'manager'
    ? 'text-violet-600 bg-violet-50'
    : 'text-blue-600 bg-blue-50'

  return (
    <header className="h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-20 hidden md:flex">
      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowSearch(true)
            }}
            onFocus={() => setShowSearch(true)}
            placeholder="Search goals, people, teams..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg text-sm text-gray-700 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-primary/30 focus:ring-2 focus:ring-primary/10 outline-none transition-all"
          />
          
          {showSearch && searchQuery.length > 1 && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setShowSearch(false)}
              />
              <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-xl z-20 max-h-96 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400">Searching...</div>
                ) : searchResults.goals.length === 0 && searchResults.users.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400">No results found for "{searchQuery}"</div>
                ) : (
                  <div className="py-2">
                    {searchResults.goals.length > 0 && (
                      <div className="mb-2">
                        <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Goals</div>
                        {searchResults.goals.map(goal => (
                          <div key={goal.id} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer">
                            <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{goal.title}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{goal.thrust_area}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchResults.users.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">People</div>
                        {searchResults.users.map(user => (
                          <div key={user.id} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                              {user.full_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{user.full_name}</p>
                              <p className="text-xs text-gray-500 dark:text-slate-400">{user.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 ml-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
          aria-label="Toggle dark mode"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <NotificationCenter />

        {/* Divider */}
        <div className="w-px h-8 bg-gray-100 dark:bg-slate-700 mx-1" />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(v => !v)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm uppercase">
              {profile?.full_name?.charAt(0) || '?'}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900 leading-none">{profile?.full_name || 'User'}</p>
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 inline-block", roleColor)}>
                {roleLabel}
              </span>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-150", showUserMenu && "rotate-180")} />
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-20 animate-in slide-in-from-top-2 fade-in duration-150">
                <div className="px-4 py-2.5 border-b border-gray-100 mb-1">
                  <p className="text-sm font-semibold text-gray-900">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500">{profile?.email}</p>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); signOut(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
