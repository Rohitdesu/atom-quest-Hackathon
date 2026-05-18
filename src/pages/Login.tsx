import { useState, useEffect } from "react"
import { Target, Eye, EyeOff, Loader2, Key, Users, UserCog, ShieldCheck } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()
  const location = useLocation()
  const { session, profile } = useAuth()

  // Pre-fill demo credentials
  const fillDemo = (role: string) => {
    setEmail(`${role}@demo.com`)
    setPassword("demo123")
    toast.success(`Loaded demo ${role} credentials`)
  }

  // Redirect if already logged in and profile loaded
  useEffect(() => {
    if (session && profile) {
      const from = location.state?.from?.pathname
      if (from && from !== "/") {
        navigate(from, { replace: true })
      } else {
        navigate(`/${profile.role}-dashboard`, { replace: true })
      }
    }
  }, [session, profile, navigate, location])

  // Show nothing while evaluating session to prevent flash of login screen
  if (session && profile) {
    return null
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Please enter both email and password")
      return
    }

    setLoading(true)
    const loginPromise = supabase.auth.signInWithPassword({
      email,
      password,
    })

    toast.promise(loginPromise, {
      loading: 'Authenticating...',
      success: (data) => {
        if (data.error) {
          throw data.error
        }
        return 'Successfully signed in!'
      },
      error: (err) => {
        setLoading(false)
        return err.message || 'Failed to sign in'
      }
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left side: Login form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white relative">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex items-center gap-2 text-primary mb-8 animate-in fade-in slide-in-from-left-4 duration-500">
            <Target className="w-8 h-8" />
            <span className="text-2xl font-bold tracking-tight text-slate-900">GoalSync Pro</span>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please enter your credentials to access your workspace.
            </p>
          </div>

          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2.5 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-all bg-slate-50/50 focus:bg-white"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-2.5 pr-10 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm transition-all bg-slate-50/50 focus:bg-white"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary transition-colors"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-primary hover:text-primary/80 transition-colors">
                    Forgot password?
                  </a>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center items-center gap-2 rounded-lg border border-transparent bg-primary py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </div>
            </form>
            
            {/* Demo credentials helper */}
            <div className="mt-8 border-t pt-6">
              <div className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-500">
                <Key className="w-4 h-4" />
                <span>Demo Credentials</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => fillDemo('employee')}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-md border bg-slate-50 hover:bg-slate-100 hover:border-primary/50 transition-colors text-xs font-medium text-slate-700"
                >
                  <Users className="w-4 h-4 text-slate-400" />
                  Employee
                </button>
                <button
                  onClick={() => fillDemo('manager')}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-md border bg-slate-50 hover:bg-slate-100 hover:border-primary/50 transition-colors text-xs font-medium text-slate-700"
                >
                  <UserCog className="w-4 h-4 text-slate-400" />
                  Manager
                </button>
                <button
                  onClick={() => fillDemo('admin')}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-md border bg-slate-50 hover:bg-slate-100 hover:border-primary/50 transition-colors text-xs font-medium text-slate-700"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                  Admin
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Right side: Illustration / branding */}
      <div className="hidden lg:flex lg:flex-1 bg-slate-900 relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2850&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 right-0 p-12 lg:p-20 z-10 text-white animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-xs font-medium tracking-wide uppercase text-slate-200">System Online</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4 max-w-xl">
            Align your teams, achieve your goals.
          </h1>
          <p className="text-lg text-slate-300 max-w-lg leading-relaxed">
            The enterprise standard for goal setting, progress tracking, and performance management. Designed for modern organizations.
          </p>
          
          <div className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-xs font-medium text-white`}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <div className="text-sm font-medium text-slate-400">
              Trusted by 10,000+ teams
            </div>
          </div>
        </div>

        {/* Decorative grids */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full mix-blend-screen opacity-50"></div>
        <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-blue-500/20 blur-[100px] rounded-full mix-blend-screen opacity-50"></div>
      </div>
    </div>
  )
}
