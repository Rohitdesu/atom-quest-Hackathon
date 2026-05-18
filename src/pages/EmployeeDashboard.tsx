import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import type { Goal, Checkin } from "@/types"
import { Target, CheckCircle2, AlertCircle, TrendingUp, Clock, ArrowRight } from "lucide-react"
import { StatCardSkeleton, CardSkeleton } from "@/components/ui/Skeleton"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"

export default function EmployeeDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [goals, setGoals] = useState<Goal[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      setLoading(true)
      const [goalsRes, checkinsRes] = await Promise.all([
        supabase.from('goals').select('*').eq('owner_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('checkins').select('*').eq('author_id', profile.id).order('created_at', { ascending: true })
      ])
      setGoals(goalsRes.data || [])
      setCheckins(checkinsRes.data || [])
      setLoading(false)
    }
    load()
  }, [profile])

  // Derived metrics
  const weightedProgress = goals.length > 0
    ? goals.reduce((sum, g) => {
        const pct = g.target > 0 ? Math.min(100, (g.achievement / g.target) * 100) : 0
        return sum + pct * (g.weightage / 100)
      }, 0)
    : 0
  const completedGoals = goals.filter(g => g.status === 'completed').length
  const atRiskGoals = goals.filter(g => g.status === 'at_risk').length
  const pendingGoals = goals.filter(g => g.approval_status === 'pending' || g.status === 'draft').length

  // Chart data from checkins (last 6 entries)
  const chartData = checkins.slice(-6).map(c => ({
    date: new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    progress: c.achievement_update
  }))

  const greetHour = new Date().getHours()
  const greeting = greetHour < 12 ? "Good morning" : greetHour < 17 ? "Good afternoon" : "Good evening"
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Greeting Banner */}
      <div className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute top-4 right-16 w-20 h-20 bg-white/5 rounded-full" />
        <div className="relative z-10">
          <p className="text-blue-100 text-sm font-medium mb-1">{greeting},</p>
          <h1 className="text-2xl font-bold mb-1">{firstName} 👋</h1>
          <p className="text-blue-100 text-sm">
            You have <span className="font-semibold text-white">{pendingGoals} goals</span> awaiting action and{" "}
            <span className="font-semibold text-white">{goals.length}</span> total objectives this quarter.
          </p>
        </div>
        <div className="relative z-10 mt-4 flex gap-3">
          <button
            onClick={() => navigate('/goals')}
            className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors backdrop-blur-sm"
          >
            View Goals <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigate('/check-ins')}
            className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Submit Check-in
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              label: "Weighted Progress",
              value: `${weightedProgress.toFixed(0)}%`,
              sub: "across all goals",
              icon: TrendingUp,
              color: "text-primary bg-primary/10",
              bar: true,
              barVal: weightedProgress
            },
            {
              label: "Goals Complete",
              value: `${completedGoals}/${goals.length}`,
              sub: "this quarter",
              icon: CheckCircle2,
              color: "text-emerald-600 bg-emerald-50"
            },
            {
              label: "At Risk",
              value: atRiskGoals,
              sub: "need attention",
              icon: AlertCircle,
              color: atRiskGoals > 0 ? "text-red-500 bg-red-50" : "text-gray-400 bg-gray-100"
            },
            {
              label: "Pending Review",
              value: pendingGoals,
              sub: "awaiting approval",
              icon: Clock,
              color: "text-amber-600 bg-amber-50"
            },
          ].map((card, i) => (
            <div
              key={card.label}
              className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm stat-appear card-hover"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{card.label}</p>
                <div className={cn("p-2 rounded-lg", card.color.split(' ').slice(1).join(' '))}>
                  <card.icon className={cn("w-4 h-4", card.color.split(' ')[0])} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{card.value}</p>
              <p className="text-xs text-gray-400">{card.sub}</p>
              {card.bar && (
                <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, card.barVal ?? 0)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Charts + recent goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area chart */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Check-in Progress Timeline</h3>
          {chartData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400 gap-2">
              <TrendingUp className="w-8 h-8 opacity-30" />
              <p className="text-sm">No check-ins recorded yet.</p>
              <button
                onClick={() => navigate('/check-ins')}
                className="text-xs text-primary hover:underline"
              >Submit your first check-in →</button>
            </div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="progress" stroke="#3b82f6" strokeWidth={2.5} fill="url(#progressGrad)" dot={{ fill: '#3b82f6', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Goal health summary */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Goal Health</h3>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <Target className="w-8 h-8 opacity-30" />
              <p className="text-sm text-center">No goals yet. Create your first goal to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.slice(0, 4).map(goal => {
                const pct = goal.target > 0 ? Math.min(100, Math.round((goal.achievement / goal.target) * 100)) : 0
                return (
                  <div key={goal.id} className="group">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-medium text-gray-700 truncate max-w-[160px]" title={goal.title}>
                        {goal.title}
                      </p>
                      <span className={cn(
                        "text-xs font-bold",
                        pct >= 100 ? "text-emerald-600" : goal.status === 'at_risk' ? "text-red-500" : "text-primary"
                      )}>{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-700",
                          pct >= 100 ? "bg-emerald-500" : goal.status === 'at_risk' ? "bg-red-400" : "bg-primary"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {goals.length > 4 && (
                <button
                  onClick={() => navigate('/goals')}
                  className="text-xs text-primary hover:underline pt-1 w-full text-center"
                >
                  +{goals.length - 4} more goals →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
