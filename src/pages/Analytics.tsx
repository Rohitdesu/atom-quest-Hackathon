import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import type { Goal } from "@/types"
import { calcProgress, getQuarterLabel, getCurrentQuarter } from "@/lib/progress"
import {
  TrendingUp, BarChart3, Users, Target, Calendar, Loader2, AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts"

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"]

export default function Analytics() {
  const { profile } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const currentQ = getCurrentQuarter()

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      setLoading(true)
      try {
        const [goalsRes, usersRes] = await Promise.all([
          supabase.from("goals").select("*").order("created_at", { ascending: true }),
          supabase.from("users").select("*")
        ])
        setGoals(goalsRes.data || [])
        setUsers(usersRes.data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profile])

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  // ── Calculations ──────────────────────────────────────────────
  const getGoalPct = (g: Goal) => calcProgress(g.uom_type, g.target, g.achievement, g.start_date, g.end_date)

  // 1. QoQ Trend — group goals by quarter created
  const qoqMap: Record<string, { total: number; count: number }> = {}
  goals.forEach(g => {
    const q = getQuarterLabel(g.created_at)
    if (!qoqMap[q]) qoqMap[q] = { total: 0, count: 0 }
    qoqMap[q].total += getGoalPct(g)
    qoqMap[q].count += 1
  })
  const qoqData = Object.entries(qoqMap).map(([q, v]) => ({
    quarter: q,
    avgProgress: v.count > 0 ? Math.round(v.total / v.count) : 0,
    goals: v.count
  }))

  // 2. Status distribution
  const statusMap: Record<string, number> = {}
  goals.forEach(g => {
    statusMap[g.status] = (statusMap[g.status] || 0) + 1
  })
  const statusData = Object.entries(statusMap).map(([name, value]) => ({
    name: name.replace("_", " ").toUpperCase(),
    value
  }))

  // 3. UoM type distribution
  const uomMap: Record<string, number> = {}
  goals.forEach(g => {
    uomMap[g.uom_type] = (uomMap[g.uom_type] || 0) + 1
  })
  const uomData = Object.entries(uomMap).map(([name, value]) => ({ name, value }))

  // 4. Team heatmap — group by manager
  const managers = users.filter(u => u.role === "manager" || u.role === "admin")
  const teamHeatmap = managers.map(mgr => {
    const team = users.filter(u => u.manager_id === mgr.id)
    const teamGoals = goals.filter(g => team.some(t => t.id === g.owner_id))
    const avgPct = teamGoals.length > 0
      ? Math.round(teamGoals.reduce((s, g) => s + getGoalPct(g), 0) / teamGoals.length)
      : 0
    return {
      name: mgr.full_name?.split(" ")[0] + "'s Team",
      progress: avgPct,
      goalCount: teamGoals.length,
      members: team.length
    }
  }).filter(t => t.members > 0)

  // 5. Radar: thrust area coverage
  const thrustMap: Record<string, { total: number; count: number }> = {}
  goals.forEach(g => {
    if (!thrustMap[g.thrust_area]) thrustMap[g.thrust_area] = { total: 0, count: 0 }
    thrustMap[g.thrust_area].total += getGoalPct(g)
    thrustMap[g.thrust_area].count += 1
  })
  const radarData = Object.entries(thrustMap).map(([area, v]) => ({
    area: area.split(" ")[0],
    avgProgress: v.count > 0 ? Math.round(v.total / v.count) : 0
  }))

  // 6. Completion rate
  const completedGoals = goals.filter(g => g.status === "completed").length
  const atRiskGoals = goals.filter(g => g.status === "at_risk").length
  const completionRate = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0

  // 7. Delayed employees (approved goal with end_date in past and progress < 100)
  const delayed = goals.filter(g => {
    if (!g.end_date || g.locked_state === false) return false
    const past = new Date(g.end_date) < new Date()
    const incomplete = getGoalPct(g) < 100
    return past && incomplete
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quarter-over-quarter trends, department insights, and goal health.
          </p>
        </div>

        {/* Quarter badge */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <Calendar className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs text-gray-500">Active Quarter</p>
            <p className="text-sm font-bold text-primary">{currentQ.label} — Check-in: {currentQ.checkin}</p>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Goals", value: goals.length, icon: Target, color: "text-blue-600 bg-blue-50" },
          { label: "Completion Rate", value: `${completionRate}%`, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
          { label: "At Risk", value: atRiskGoals, icon: AlertTriangle, color: "text-red-500 bg-red-50" },
          { label: "Total Employees", value: users.filter(u => u.role === "employee").length, icon: Users, color: "text-violet-600 bg-violet-50" },
        ].map((kpi, i) => (
          <div key={kpi.label} className="bg-white border rounded-xl p-4 shadow-sm stat-appear card-hover" style={{ animationDelay: `${i * 0.07}s` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{kpi.label}</p>
              <div className={cn("p-2 rounded-lg", kpi.color.split(" ").slice(1).join(" "))}>
                <kpi.icon className={cn("w-4 h-4", kpi.color.split(" ")[0])} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* QoQ Trend */}
      <div className="bg-white border rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Quarter-over-Quarter Progress Trend</h3>
        <p className="text-xs text-gray-400 mb-5">Average goal completion percentage grouped by creation quarter.</p>
        {qoqData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No quarterly data yet.</div>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={qoqData}>
                <defs>
                  <linearGradient id="qoqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[0, 100]} width={35} />
                <Tooltip
                  formatter={(v: any) => [`${v}%`, "Avg Progress"]}
                  contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="avgProgress" stroke="#3b82f6" strokeWidth={2.5} fill="url(#qoqGrad)" dot={{ fill: "#3b82f6", r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Pie */}
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Goal Status Distribution</h3>
          {statusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }} />
                  <Legend verticalAlign="bottom" height={28} iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* UoM Type Bar */}
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Goal Type Distribution</h3>
          {uomData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={uomData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Radar chart - Thrust Areas */}
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Thrust Area Coverage</h3>
          {radarData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="area" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Radar name="Avg %" dataKey="avgProgress" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Department Heatmap */}
      <div className="bg-white border rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-5">Department Progress Heatmap</h3>
        {teamHeatmap.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No department data available. Assign manager_id to employees.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamHeatmap.map(t => (
              <div key={t.name} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    t.progress >= 80 ? "bg-emerald-100 text-emerald-700" :
                    t.progress >= 50 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                  )}>{t.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div
                    className={cn("h-2 rounded-full transition-all duration-700",
                      t.progress >= 80 ? "bg-emerald-500" : t.progress >= 50 ? "bg-primary" : "bg-amber-500"
                    )}
                    style={{ width: `${t.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">{t.members} members · {t.goalCount} goals</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delayed goals alert */}
      {delayed.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Overdue Goals ({delayed.length})
          </h3>
          <div className="space-y-2">
            {delayed.slice(0, 5).map(g => {
              const owner = users.find(u => u.id === g.owner_id)
              return (
                <div key={g.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-red-900">{g.title}</span>
                    <span className="text-red-600 ml-2">— {owner?.full_name}</span>
                  </div>
                  <span className="text-xs text-red-500">Due: {new Date(g.end_date!).toLocaleDateString()}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
