import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext"
import {
  User, Bell, Palette, Settings as SettingsIcon,
  Lock, RefreshCw, Key, Building2, UploadCloud, Check, Sun, Moon, Target
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Tab =
  | 'profile' | 'account' | 'notifications' | 'appearance'
  | 'goals' | 'security' | 'cycle' | 'unlock' | 'department'

export default function Settings() {
  const { profile } = useAuth()
  const { toggleTheme, isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [saving, setSaving] = useState(false)

  // Profile State
  const [fullName, setFullName] = useState(profile?.full_name || "")

  const handleSave = async () => {
    setSaving(true)
    // Mock save delay
    await new Promise(r => setTimeout(r, 800))
    toast.success("Settings saved successfully.")
    setSaving(false)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    toast.success("Password updated successfully.")
    setSaving(false)
  }

  const navItems = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'account', label: 'Account Settings', icon: SettingsIcon },
    { id: 'notifications', label: 'Notification Preferences', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'goals', label: 'Goal Preferences', icon: Target },
    { id: 'security', label: 'Security', icon: Key },
  ]

  const adminItems = [
    { id: 'cycle', label: 'Cycle Management', icon: RefreshCw },
    { id: 'unlock', label: 'Goal Unlock Controls', icon: Lock },
    { id: 'department', label: 'Department Management', icon: Building2 },
  ]

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" />
          Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  activeTab === item.id
                    ? "bg-primary text-white shadow-sm shadow-primary/25"
                    : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}

            {profile?.role === 'admin' && (
              <>
                <div className="pt-6 pb-2 px-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                    Administration
                  </p>
                </div>
                {adminItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as Tab)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      activeTab === item.id
                        ? "bg-primary text-white shadow-sm shadow-primary/25"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </>
            )}
          </nav>
        </aside>

        {/* Settings Content */}
        <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-sm p-6 lg:p-8">
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Profile Settings</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Manage your public profile information.</p>
              </div>
              <div className="h-px bg-gray-100 dark:bg-slate-800 w-full" />
              
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary text-2xl font-bold shrink-0 relative group cursor-pointer overflow-hidden">
                  {profile?.full_name?.charAt(0) || '?'}
                  <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all">
                    <UploadCloud className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100">Profile Photo</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 mb-3">JPG, GIF or PNG. Max size of 2MB.</p>
                  <div className="flex gap-3">
                    <button className="px-3 py-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      Change
                    </button>
                    <button className="px-3 py-1.5 text-red-600 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-gray-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Role</label>
                  <input
                    type="text"
                    disabled
                    value={profile?.role.toUpperCase()}
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-gray-500 dark:text-slate-500 cursor-not-allowed"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-fit mt-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Account Settings</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Manage your account email and regional preferences.</p>
              </div>
              <div className="h-px bg-gray-100 dark:bg-slate-800 w-full" />
              
              <div className="grid gap-5 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ""}
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-gray-500 dark:text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-gray-400 mt-1.5">Email changes must be requested through HR.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Timezone</label>
                  <select className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100">
                    <option>(GMT-08:00) Pacific Time</option>
                    <option>(GMT-05:00) Eastern Time</option>
                    <option>(GMT+00:00) UTC</option>
                    <option>(GMT+05:30) India Standard Time</option>
                  </select>
                </div>
                <button onClick={handleSave} className="w-fit mt-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  Update Account
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Notification Preferences</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Choose how and when you want to be notified.</p>
              </div>
              <div className="h-px bg-gray-100 dark:bg-slate-800 w-full" />
              
              <div className="space-y-4">
                {[
                  { title: "Email Notifications", desc: "Receive email alerts when goals are updated or approved.", defaultChecked: true },
                  { title: "In-App Notifications", desc: "Show badges and alerts inside the application.", defaultChecked: true },
                  { title: "Quarterly Reminders", desc: "Get reminded before check-in windows close.", defaultChecked: true },
                  { title: "Weekly Digest", desc: "A summary of team progress sent every Friday.", defaultChecked: false }
                ].map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{item.title}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input type="checkbox" defaultChecked={item.defaultChecked} className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </div>
              <button onClick={handleSave} className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                Save Preferences
              </button>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Appearance Settings</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Customize how GoalSync looks on your device.</p>
              </div>
              <div className="h-px bg-gray-100 dark:bg-slate-800 w-full" />
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                <button
                  onClick={() => !isDark && toggleTheme()}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                    !isDark ? "border-primary bg-primary/5" : "border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-1">
                    <Sun className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100">Light Mode</span>
                  {!isDark && <Check className="w-4 h-4 text-primary absolute top-4 right-4" />}
                </button>

                <button
                  onClick={() => isDark && toggleTheme()}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all relative",
                    isDark ? "border-primary bg-primary/5" : "border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 mb-1">
                    <Moon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100">Dark Mode</span>
                  {isDark && <Check className="w-4 h-4 text-primary absolute top-4 right-4" />}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Security Settings</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Manage your password and account security.</p>
              </div>
              <div className="h-px bg-gray-100 dark:bg-slate-800 w-full" />
              
              <form onSubmit={handlePasswordChange} className="grid gap-5 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Current Password</label>
                  <input type="password" required className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">New Password</label>
                  <input type="password" required className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
                  <input type="password" required className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <button type="submit" disabled={saving} className="w-fit mt-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'department' && (
            <DepartmentManagement />
          )}

          {/* Placeholders for others */}
          {['goals', 'cycle', 'unlock'].includes(activeTab) && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 capitalize">{activeTab.replace('_', ' ')} Settings</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Configuration options for {activeTab.replace('_', ' ')} module.</p>
              </div>
              <div className="h-px bg-gray-100 dark:bg-slate-800 w-full" />
              <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
                <SettingsIcon className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Settings panel configured.</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Enterprise integrations sync automatically.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DepartmentManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').order('full_name')
      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      toast.error(err.message || "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleAssignManager = async (userId: string, managerId: string) => {
    setSaving(userId)
    try {
      const { error } = await supabase.from('users').update({ manager_id: managerId || null }).eq('id', userId)
      if (error) throw error
      toast.success("Manager assigned successfully.")
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || "Failed to assign manager")
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading department data...</div>

  const managers = users.filter(u => u.role === 'manager' || u.role === 'admin')
  const employees = users.filter(u => u.role === 'employee' || u.role === 'manager')

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Department Management</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Assign employees to managers to form teams.</p>
      </div>
      <div className="h-px bg-gray-100 dark:bg-slate-800 w-full" />
      
      <div className="space-y-4">
        {employees.map(emp => (
          <div key={emp.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{emp.full_name}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{emp.email} • {emp.role}</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                className="w-48 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-gray-900 dark:text-slate-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={emp.manager_id || ""}
                onChange={(e) => handleAssignManager(emp.id, e.target.value)}
                disabled={saving === emp.id}
              >
                <option value="">No Manager Assigned</option>
                {managers.filter(m => m.id !== emp.id).map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
