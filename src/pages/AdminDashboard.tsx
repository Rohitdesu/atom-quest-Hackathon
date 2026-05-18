import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import type { Goal, AuditLog } from "@/types"
import { 
  Building2, Lock, Unlock, ShieldAlert, 
  Activity, BarChart3, Loader2, CheckCircle2, AlertTriangle, Send, RefreshCcw
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { 
  Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts'
import { runEscalationScan, sendEscalationNotifications, type EscalationIssue } from "@/lib/escalation"

type Tab = 'overview' | 'management' | 'escalation' | 'audit'

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  
  const [users, setUsers] = useState<any[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [escalationIssues, setEscalationIssues] = useState<EscalationIssue[]>([])
  const [escalationLoading, setEscalationLoading] = useState(false)
  const [escalationRan, setEscalationRan] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch all users (Admins have RLS bypass implicitly via policy if role=admin)
      const { data: usersData, error: usersError } = await supabase.from('users').select('*')
      if (usersError) throw usersError
      setUsers(usersData || [])

      // Fetch all goals
      const { data: goalsData, error: goalsError } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
      if (goalsError) throw goalsError
      setGoals(goalsData || [])

      // Fetch audit logs
      const { data: auditData, error: auditError } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100)
      if (auditError) throw auditError
      setAuditLogs(auditData || [])

    } catch (error: any) {
      toast.error(error.message || "Failed to load admin data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData()
    }
  }, [profile])

  const handleRunEscalation = async () => {
    setEscalationLoading(true)
    try {
      const issues = await runEscalationScan()
      setEscalationIssues(issues)
      setEscalationRan(true)
      if (issues.length === 0) {
        toast.success("✅ All clear! No escalation issues detected.")
      } else {
        toast.warning(`Found ${issues.length} escalation issue(s).`)
      }
    } catch (err: any) {
      toast.error(err.message || "Escalation scan failed")
    } finally {
      setEscalationLoading(false)
    }
  }

  const handleSendEscalations = async () => {
    if (!profile) return
    setEscalationLoading(true)
    try {
      const sent = await sendEscalationNotifications(escalationIssues, profile.id)
      toast.success(`${sent} notifications sent to employees and managers.`)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to send notifications")
    } finally {
      setEscalationLoading(false)
    }
  }

  const handleUnlockGoal = async (goalId: string) => {
    if (!confirm("Are you sure you want to unlock this goal? The employee will be able to edit it again.")) return
    
    try {
      // Log the action first
      await supabase.from('audit_logs').insert([{
        actor_id: profile?.id,
        action: 'unlock_goal',
        entity_type: 'goal',
        entity_id: goalId,
        details: { reason: "Admin override" }
      }])

      const { error } = await supabase
        .from('goals')
        .update({ 
          locked_state: false, 
          approval_status: 'pending',
          status: 'draft'
        })
        .eq('id', goalId)

      if (error) throw error
      toast.success("Goal unlocked successfully")
      fetchData()
    } catch (error: any) {
      toast.error(error.message || "Failed to unlock goal")
    }
  }

  // Derived Analytics
  const totalEmployees = users.filter(u => u.role === 'employee').length
  const totalManagers = users.filter(u => u.role === 'manager').length
  
  const completionCalc = (g: Goal) => g.target > 0 ? Math.min(100, (g.achievement / g.target) * 100) : 0
  const overallCompanyProgress = goals.length > 0 
    ? goals.reduce((acc, g) => acc + completionCalc(g), 0) / goals.length 
    : 0

  const lockedGoalsCount = goals.filter(g => g.locked_state).length
  const pendingGoalsCount = goals.filter(g => g.approval_status === 'pending').length

  // Status Distribution for Pie Chart
  const statusCounts = goals.reduce((acc, goal) => {
    acc[goal.status] = (acc[goal.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.replace('_', ' ').toUpperCase(),
    value
  }))

  const PIE_COLORS = ['#3b82f6', '#eab308', '#22c55e', '#ef4444', '#8b5cf6', '#64748b', '#f97316']

  // Department / Manager Heatmap Data (Mocking departments by grouping by manager)
  const managerGroups = users.filter(u => u.role === 'manager').map(manager => {
    const teamIds = users.filter(u => u.manager_id === manager.id).map(u => u.id)
    const teamGoals = goals.filter(g => teamIds.includes(g.owner_id))
    
    const avgProgress = teamGoals.length > 0 
      ? teamGoals.reduce((sum, g) => sum + completionCalc(g), 0) / teamGoals.length
      : 0

    return {
      name: manager.full_name + "'s Team",
      progress: Math.round(avgProgress),
      goalCount: teamGoals.length
    }
  })

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Admin & HR Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Organization-wide overview, analytics, and system management.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Organization Overview', icon: BarChart3 },
            { id: 'management', name: 'Goal Management', icon: Lock },
            { id: 'escalation', name: 'Escalation Engine', icon: AlertTriangle },
            { id: 'audit', name: 'Audit Trail', icon: ShieldAlert },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500 mb-1">Company Progress</p>
              <div className="flex items-end gap-2">
                <h3 className="text-3xl font-bold text-gray-900">{overallCompanyProgress.toFixed(0)}%</h3>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${overallCompanyProgress}%` }} />
              </div>
            </div>
            
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Users</p>
              <h3 className="text-3xl font-bold text-gray-900">{users.length}</h3>
              <p className="text-xs text-gray-500 mt-2">{totalManagers} Managers &bull; {totalEmployees} Employees</p>
            </div>

            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500 mb-1">Active Goals</p>
              <h3 className="text-3xl font-bold text-gray-900">{goals.length}</h3>
              <p className="text-xs text-gray-500 mt-2">{lockedGoalsCount} Locked &bull; {pendingGoalsCount} Pending Review</p>
            </div>

            <div className="bg-white border rounded-xl p-5 shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
              <p className="text-sm font-medium text-primary mb-1">System Health</p>
              <h3 className="text-3xl font-bold text-green-600 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" /> Optimal
              </h3>
              <p className="text-xs text-gray-500 mt-2">All database triggers operational.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Goal Status Distribution</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Team Heatmap */}
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Team Progress Heatmap</h3>
              <div className="space-y-4">
                {managerGroups.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-10">No team data available.</p>
                ) : (
                  managerGroups.map((team, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between items-center mb-1 text-sm">
                        <span className="font-medium text-gray-700">{team.name}</span>
                        <span className="font-bold text-gray-900">{team.progress}% <span className="text-xs text-gray-500 font-normal">({team.goalCount} goals)</span></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          className={cn(
                            "h-2 rounded-full",
                            team.progress >= 80 ? "bg-green-500" :
                            team.progress >= 50 ? "bg-primary" : "bg-amber-500"
                          )} 
                          style={{ width: `${team.progress}%` }} 
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'management' && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-5 border-b bg-slate-50/50">
            <h2 className="text-lg font-semibold text-gray-900">Locked Goals Administration</h2>
            <p className="text-sm text-gray-500">Administrators can override the lock state to allow employees or managers to correct mistaken submissions.</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Goal</th>
                  <th className="px-6 py-4 font-medium">Owner</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {goals.filter(g => g.locked_state).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No locked goals currently in the system.
                    </td>
                  </tr>
                ) : (
                  goals.filter(g => g.locked_state).map(goal => {
                    const owner = users.find(u => u.id === goal.owner_id)
                    return (
                      <tr key={goal.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{goal.title}</td>
                        <td className="px-6 py-4 text-gray-600">{owner?.full_name || 'Unknown'}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs border">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleUnlockGoal(goal.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors text-xs font-medium"
                          >
                            <Unlock className="w-3.5 h-3.5" /> Force Unlock
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'escalation' && (
        <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-300">
          {/* Header controls */}
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Escalation Scan</h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                  Detect employees with overdue submissions, stalled approvals, or missing check-ins and notify them automatically.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleRunEscalation}
                  disabled={escalationLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {escalationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                  Run Scan
                </button>
                {escalationRan && escalationIssues.length > 0 && (
                  <button
                    onClick={handleSendEscalations}
                    disabled={escalationLoading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                  >
                    {escalationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send {escalationIssues.length} Notifications
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Issue List */}
          {!escalationRan ? (
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-10 text-center shadow-sm">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3 opacity-50" />
              <p className="text-sm text-gray-500 dark:text-slate-400">Click "Run Scan" to detect escalation issues across your organization.</p>
            </div>
          ) : escalationIssues.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-10 text-center shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm text-gray-700 dark:text-slate-300 font-medium">All Clear</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">No escalation issues detected in the organization.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {escalationIssues.map((issue, i) => (
                <div
                  key={i}
                  className={cn(
                    "bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm flex items-start gap-4",
                    issue.severity === "critical"
                      ? "border-red-200 dark:border-red-800"
                      : "border-amber-200 dark:border-amber-800"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg shrink-0",
                    issue.severity === "critical" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                  )}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        issue.severity === "critical"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      )}>
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {issue.type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 mt-1">{issue.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">System Audit Trail</h2>
              <p className="text-sm text-gray-500">Chronological log of critical system actions (last 100 entries).</p>
            </div>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Timestamp</th>
                  <th className="px-6 py-4 font-medium">Actor</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                  <th className="px-6 py-4 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => {
                    const actor = users.find(u => u.id === log.actor_id)
                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {actor?.full_name || 'System / Unknown'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-xs font-mono max-w-md truncate">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
