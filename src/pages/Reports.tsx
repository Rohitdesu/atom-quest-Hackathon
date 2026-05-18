import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import type { Goal } from "@/types"
import { 
  FileSpreadsheet, Download, Search, Filter, 
  ChevronUp, ChevronDown, Loader2, BarChart3, TrendingUp, FileDown
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import * as XLSX from "xlsx"

type SortField = 'title' | 'owner_name' | 'thrust_area' | 'status' | 'achievement' | 'weightage'
type SortOrder = 'asc' | 'desc'

export default function Reports() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  
  // Data State
  const [goals, setGoals] = useState<(Goal & { owner_name: string; manager_id: string | null })[]>([])
  const [users, setUsers] = useState<any[]>([])

  // Filter State
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedManager, setSelectedManager] = useState<string>("all")
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  
  // Sort & Pagination State
  const [sortField, setSortField] = useState<SortField>('owner_name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fetchData = async () => {
    if (!profile) return
    setLoading(true)
    try {
      let usersQuery = supabase.from('users').select('*')
      let goalsQuery = supabase.from('goals').select('*')

      // If manager, restrict to team. Admin gets all. Employee gets own.
      if (profile.role === 'manager') {
        const { data: team } = await supabase.from('users').select('id').eq('manager_id', profile.id)
        const teamIds = [profile.id, ...(team?.map(t => t.id) || [])]
        usersQuery = usersQuery.in('id', teamIds)
        goalsQuery = goalsQuery.in('owner_id', teamIds)
      } else if (profile.role === 'employee') {
        usersQuery = usersQuery.eq('id', profile.id)
        goalsQuery = goalsQuery.eq('owner_id', profile.id)
      }

      const [usersRes, goalsRes] = await Promise.all([usersQuery, goalsQuery])
      
      if (usersRes.error) throw usersRes.error
      if (goalsRes.error) throw goalsRes.error

      setUsers(usersRes.data || [])
      
      // Combine goal data with owner name for easier sorting/filtering
      const enrichedGoals = (goalsRes.data || []).map(g => {
        const owner = usersRes.data?.find(u => u.id === g.owner_id)
        return {
          ...g,
          owner_name: owner?.full_name || 'Unknown',
          manager_id: owner?.manager_id || null
        }
      })
      
      setGoals(enrichedGoals)
    } catch (error: any) {
      toast.error(error.message || "Failed to load report data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [profile])

  // Computed data pipeline (Filter -> Sort -> Paginate)
  const filteredData = useMemo(() => {
    return goals.filter(g => {
      const matchSearch = g.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          g.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          g.thrust_area.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchManager = selectedManager === 'all' || g.manager_id === selectedManager || (g.owner_id === selectedManager && !g.manager_id)
      const matchEmployee = selectedEmployee === 'all' || g.owner_id === selectedEmployee
      const matchStatus = selectedStatus === 'all' || g.status === selectedStatus

      return matchSearch && matchManager && matchEmployee && matchStatus
    })
  }, [goals, searchTerm, selectedManager, selectedEmployee, selectedStatus])

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA: any = a[sortField]
      let valB: any = b[sortField]

      // Handle special calculation for achievement
      if (sortField === 'achievement') {
        valA = a.target > 0 ? (a.achievement / a.target) : 0
        valB = b.target > 0 ? (b.achievement / b.target) : 0
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredData, sortField, sortOrder])

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedData.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedData, currentPage])

  const totalPages = Math.ceil(sortedData.length / itemsPerPage)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Export functions
  const getExportRows = () => sortedData.map(g => {
    const progress = g.target > 0 ? Math.min(100, Math.round((g.achievement / g.target) * 100)) : 0
    return {
      "Employee": g.owner_name,
      "Goal Title": g.title,
      "Thrust Area": g.thrust_area,
      "Status": g.status.replace('_', ' '),
      "UoM Type": g.uom_type,
      "Target": g.target,
      "Achievement": g.achievement,
      "Progress %": `${progress}%`,
      "Weightage %": `${g.weightage}%`,
      "Start Date": g.start_date || '',
      "Deadline": g.end_date || '',
    }
  })

  const exportCSV = () => {
    if (sortedData.length === 0) return toast.error("No data to export")
    const rows = getExportRows()
    const headers = Object.keys(rows[0])
    const csvContent = [
      headers.join(","),
      ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    ].join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.setAttribute("href", URL.createObjectURL(blob))
    link.setAttribute("download", `goalsync_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
    toast.success("CSV downloaded successfully")
  }

  const exportExcel = () => {
    if (sortedData.length === 0) return toast.error("No data to export")
    const rows = getExportRows()
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Goals Report")
    // Auto-size columns
    ws['!cols'] = Object.keys(rows[0]).map(key => ({ wch: Math.max(key.length, 15) }))
    XLSX.writeFile(wb, `goalsync_report_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success("Excel file downloaded successfully")
  }

  // Get unique managers for filter
  const managers = users.filter(u => u.role === 'manager' || u.role === 'admin')
  const statusOptions = ['draft', 'in_review', 'approved', 'in_progress', 'completed', 'at_risk', 'cancelled']

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Reports & Exports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and export planned vs actual achievement reports.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Analytics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><FileSpreadsheet className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{filteredData.length}</p>
              </div>
            </div>
            <div className="bg-white border rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Avg Completion</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredData.length > 0 
                    ? Math.round(filteredData.reduce((acc, g) => acc + (g.target > 0 ? (g.achievement / g.target) * 100 : 0), 0) / filteredData.length)
                    : 0}%
                </p>
              </div>
            </div>
            <div className="bg-white border rounded-xl p-4 shadow-sm md:col-span-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Quick Filters Applied</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedManager !== 'all' || selectedEmployee !== 'all' || selectedStatus !== 'all' ? 'Custom Filter Active' : 'Showing All Data'}
                </p>
              </div>
              <button 
                onClick={() => {setSearchTerm(''); setSelectedManager('all'); setSelectedEmployee('all'); setSelectedStatus('all');}}
                className="text-xs text-primary hover:underline font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white border rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-700">
              <Filter className="w-4 h-4" /> Filter Options
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search goals..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>

              {profile?.role === 'admin' && (
                <select 
                  value={selectedManager}
                  onChange={(e) => { setSelectedManager(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white"
                >
                  <option value="all">All Departments (Managers)</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}'s Team</option>
                  ))}
                </select>
              )}

              {(profile?.role === 'admin' || profile?.role === 'manager') && (
                <select 
                  value={selectedEmployee}
                  onChange={(e) => { setSelectedEmployee(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white"
                >
                  <option value="all">All Employees</option>
                  {users.filter(u => u.role === 'employee' || u.id === profile.id).map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              )}

              <select 
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white"
              >
                <option value="all">All Statuses</option>
                {statusOptions.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Report Table */}
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-gray-500 uppercase bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100" onClick={() => handleSort('owner_name')}>
                      <div className="flex items-center gap-1">Employee {sortField === 'owner_name' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                    </th>
                    <th className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100" onClick={() => handleSort('title')}>
                      <div className="flex items-center gap-1">Goal {sortField === 'title' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                    </th>
                    <th className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100" onClick={() => handleSort('thrust_area')}>
                      <div className="flex items-center gap-1">Thrust Area {sortField === 'thrust_area' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                    </th>
                    <th className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">Status {sortField === 'status' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                    </th>
                    <th className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100" onClick={() => handleSort('achievement')}>
                      <div className="flex items-center gap-1">Progress {sortField === 'achievement' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                    </th>
                    <th className="px-6 py-4 font-medium text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('weightage')}>
                      <div className="flex items-center justify-end gap-1">Wt % {sortField === 'weightage' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No records match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map(goal => {
                      const progress = goal.target > 0 ? Math.min(100, (goal.achievement / goal.target) * 100) : 0
                      
                      return (
                        <tr key={goal.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-gray-900">{goal.owner_name}</td>
                          <td className="px-6 py-3 text-gray-700 max-w-[200px] truncate" title={goal.title}>{goal.title}</td>
                          <td className="px-6 py-3 text-gray-600">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs border">
                              {goal.thrust_area}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-medium capitalize",
                              goal.status === 'completed' ? 'bg-green-100 text-green-700' :
                              goal.status === 'at_risk' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            )}>
                              {goal.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex flex-col gap-1 w-32">
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>{goal.achievement} {goal.uom_type}</span>
                                <span>{goal.target}</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5">
                                <div 
                                  className={cn("h-1.5 rounded-full", progress >= 100 ? "bg-green-500" : "bg-primary")}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right font-medium text-gray-900">{goal.weightage}%</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between bg-white">
                <span className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length} entries
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm border rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
