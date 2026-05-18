import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import type { Goal } from "@/types"
import { Users, FileCheck, Loader2, Search, CheckCircle2, Clock } from "lucide-react"
import ApprovalModal from "@/components/manager/ApprovalModal"
import { toast } from "sonner"


export default function ManagerDashboard() {
  const { profile } = useAuth()
  const [teamMembers, setTeamMembers] = useState<{id: string, full_name: string, email: string}[]>([])
  const [teamGoals, setTeamGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [goalToReview, setGoalToReview] = useState<Goal | null>(null)
  const [reviewTeamMemberName, setReviewTeamMemberName] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const fetchData = async () => {
    if (!profile) return
    setLoading(true)
    try {
      // 1. Fetch team members
      const { data: members, error: memberError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('manager_id', profile.id)

      if (memberError) throw memberError
      setTeamMembers(members || [])

      if (members && members.length > 0) {
        const memberIds = members.map(m => m.id)
        // 2. Fetch their goals
        const { data: goals, error: goalsError } = await supabase
          .from('goals')
          .select('*')
          .in('owner_id', memberIds)
          .order('created_at', { ascending: false })

        if (goalsError) throw goalsError
        setTeamGoals(goals || [])
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load team data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [profile])

  const openReviewModal = (goal: Goal) => {
    const memberName = teamMembers.find(m => m.id === goal.owner_id)?.full_name || "Unknown Member"
    setReviewTeamMemberName(memberName)
    setGoalToReview(goal)
    setIsModalOpen(true)
  }

  // Derived stats
  const pendingApprovals = teamGoals.filter(g => g.approval_status === 'pending')
  const filteredApprovals = pendingApprovals.filter(g => {
    const memberName = teamMembers.find(m => m.id === g.owner_id)?.full_name?.toLowerCase() || ""
    return g.title.toLowerCase().includes(searchTerm.toLowerCase()) || memberName.includes(searchTerm.toLowerCase())
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Manager Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Oversee your team's objectives and performance.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-medium text-gray-700">Team Size</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{teamMembers.length}</p>
            </div>
            
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-medium text-gray-700">Pending Approvals</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{pendingApprovals.length}</p>
            </div>

            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-medium text-gray-700">Active Goals</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {teamGoals.filter(g => g.status === 'approved' || g.status === 'in_progress').length}
              </p>
            </div>
          </div>

          {/* Pending Approvals Section */}
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Goal Approvals</h2>
              </div>
              
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search goals or team members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-medium">Employee</th>
                    <th className="px-6 py-4 font-medium">Goal Title</th>
                    <th className="px-6 py-4 font-medium">Area</th>
                    <th className="px-6 py-4 font-medium">Target</th>
                    <th className="px-6 py-4 font-medium text-right">Weightage</th>
                    <th className="px-6 py-4 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredApprovals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        {pendingApprovals.length === 0 
                          ? "No pending approvals. Your team is all set!" 
                          : "No goals match your search."}
                      </td>
                    </tr>
                  ) : (
                    filteredApprovals.map(goal => {
                      const member = teamMembers.find(m => m.id === goal.owner_id)
                      return (
                        <tr key={goal.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{member?.full_name || 'Unknown'}</div>
                            <div className="text-gray-500 text-xs">{member?.email}</div>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900 max-w-[250px] truncate" title={goal.title}>
                            {goal.title}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs border">
                              {goal.thrust_area}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {goal.target} {goal.uom_type}
                          </td>
                          <td className="px-6 py-4 text-right font-medium">
                            {goal.weightage}%
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => openReviewModal(goal)}
                              className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-md transition-colors text-xs font-medium"
                            >
                              Review
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
          
          {/* Team Members List */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">My Team</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.length === 0 ? (
                <div className="col-span-full p-6 bg-slate-50 border border-dashed rounded-lg text-center text-gray-500 text-sm">
                  No team members are currently assigned to you.
                </div>
              ) : (
                teamMembers.map(member => {
                  const memberGoals = teamGoals.filter(g => g.owner_id === member.id)
                  const approvedCount = memberGoals.filter(g => g.approval_status === 'approved').length
                  
                  return (
                    <div key={member.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {member.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{member.full_name}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Approved</p>
                        <p className="font-semibold text-sm text-gray-900">{approvedCount} / {memberGoals.length}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}

      <ApprovalModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchData}
        goalToReview={goalToReview}
        teamMemberName={reviewTeamMemberName}
      />
    </div>
  )
}
