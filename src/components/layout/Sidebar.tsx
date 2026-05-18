import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Target,
  CheckSquare,
  BarChart3,
  PieChart,
  Settings,
  Menu,
  X,
  ShieldCheck,
  Users,
  Building2,
  Share2
} from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import type { UserRole } from "@/contexts/AuthContext"



const navGroups = [
  {
    label: "Dashboards",
    items: [
      { name: "My Dashboard", href: "/employee-dashboard", icon: LayoutDashboard, roles: ['employee', 'manager', 'admin'] as UserRole[] },
      { name: "Team Overview", href: "/manager-dashboard", icon: Users, roles: ['manager', 'admin'] as UserRole[] },
      { name: "Admin & HR", href: "/admin-dashboard", icon: Building2, roles: ['admin'] as UserRole[] },
    ]
  },
  {
    label: "Work",
    items: [
      { name: "My Goals", href: "/goals", icon: Target },
      { name: "Check-ins", href: "/check-ins", icon: CheckSquare },
      { name: "Shared Goals", href: "/shared-goals", icon: Share2, roles: ['manager', 'admin'] as UserRole[] },
    ]
  },
  {
    label: "Insights",
    items: [
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "Analytics", href: "/analytics", icon: PieChart },
    ]
  },
  {
    label: "System",
    items: [
      { name: "Settings", href: "/settings", icon: Settings },
    ]
  }
]

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const { profile } = useAuth()
  const location = useLocation()

  // Close mobile drawer on route change
  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  const roleLabel = profile?.role === 'admin' ? 'Administrator' : profile?.role === 'manager' ? 'Manager' : 'Employee'

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden h-14 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="flex items-center gap-2 font-bold text-lg text-primary">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 text-white" />
          </div>
          GoalSync Pro
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 flex flex-col transition-transform duration-250 ease-in-out",
          "md:static md:translate-x-0 md:z-auto",
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-gray-100 dark:border-slate-800">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-slate-100 text-sm leading-none">GoalSync Pro</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Performance Platform</p>
          </div>
        </div>

        {/* User badge */}
        <div className="mx-3 mt-4 mb-2 px-3 py-2.5 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-xl flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center shrink-0">
            {profile?.full_name?.charAt(0) || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate leading-tight">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-primary/80 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3" /> {roleLabel}
            </p>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
          {navGroups.map(group => {
            const visibleItems = group.items.filter(item => {
              if (!('roles' in item) || !item.roles) return true
              if (!profile) return false
              return (item.roles as UserRole[]).includes(profile.role)
            })
            if (visibleItems.length === 0) return null

            return (
              <div key={group.label}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-600 px-3 mb-1.5">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map(item => (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                          isActive
                            ? "bg-primary text-white shadow-sm shadow-primary/25"
                            : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className={cn(
                            "w-4 h-4 shrink-0 transition-transform duration-150",
                            !isActive && "group-hover:scale-110"
                          )} />
                          {item.name}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800">
          <p className="text-[11px] text-gray-400 dark:text-slate-600 text-center">GoalSync Pro &copy; {new Date().getFullYear()}</p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}
