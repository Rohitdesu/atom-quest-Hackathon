export default function Dashboard({ title }: { title: string }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Metric {i + 1}</h3>
            <div className="text-2xl font-bold text-gray-900">1,234</div>
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <span>+12%</span> from last month
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="bg-white rounded-xl border p-6 shadow-sm lg:col-span-4 min-h-[400px]">
          <h3 className="font-semibold text-lg mb-4">Overview</h3>
          {/* Chart placeholder */}
          <div className="h-full w-full flex items-center justify-center bg-slate-50/50 rounded border border-dashed">
            <span className="text-slate-400">Chart Visualization</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-6 shadow-sm lg:col-span-3 min-h-[400px]">
          <h3 className="font-semibold text-lg mb-4">Recent Activity</h3>
          {/* List placeholder */}
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-slate-100 rounded mb-1" />
                  <div className="h-3 w-32 bg-slate-50 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
