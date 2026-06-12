import { useEffect, useState } from 'react'
import { BarChart2, Users, Network, Shield, Activity, ChevronRight, PlusCircle, LogOut, User, Sun, Moon } from 'lucide-react'
import { getStats } from './api'
import type { Stats } from './types'
import Dashboard from './components/Dashboard'
import PersonsTable from './components/PersonsTable'
import PersonDetail from './components/PersonDetail'
import EntityMatches from './components/EntityMatches'
import SubmitPersonForm from './components/SubmitPersonForm'
import SignIn from './components/SignIn'
import SignUp from './components/SignUp'

type Tab = 'dashboard' | 'persons' | 'entities' | 'submit'
type AuthView = 'signin' | 'signup'

interface AuthUser {
  name: string
  email: string
}

const NAV_ITEMS = [
  { id: 'dashboard' as Tab, label: 'Dashboard',         icon: BarChart2 },
  { id: 'persons'   as Tab, label: 'Individuals',        icon: Users },
  { id: 'entities'  as Tab, label: 'Entity Resolution',  icon: Network },
  { id: 'submit'    as Tab, label: 'Data Submit Karein', icon: PlusCircle },
]

function loadSession(): AuthUser | null {
  try {
    const s = localStorage.getItem('fbr_session')
    return s ? JSON.parse(s) : null
  } catch {
    return null
  }
}

export default function App() {
  const [user, setUser]           = useState<AuthUser | null>(loadSession)
  const [authView, setAuthView]   = useState<AuthView>('signin')
  const [stats, setStats]         = useState<Stats | null>(null)
  const [tab, setTab]             = useState<Tab>('dashboard')
  const [selectedCnic, setSelectedCnic] = useState<string | null>(null)
  const [isDark, setIsDark]       = useState(() => {
    const saved = localStorage.getItem('fbr_theme')
    return saved ? saved === 'dark' : true
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
    }
    localStorage.setItem('fbr_theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const refreshStats = () => getStats().then(setStats)

  useEffect(() => {
    if (user) refreshStats()
  }, [user])

  const handleSelectPerson = (cnic: string) => {
    setSelectedCnic(cnic)
    setTab('persons')
  }

  const handleSignOut = () => {
    localStorage.removeItem('fbr_session')
    setUser(null)
    setStats(null)
    setTab('dashboard')
    setSelectedCnic(null)
  }

  // Not logged in — show auth screens
  if (!user) {
    return authView === 'signin'
      ? <SignIn onSignIn={setUser} onGoSignUp={() => setAuthView('signup')} />
      : <SignUp onSignUp={setUser} onGoSignIn={() => setAuthView('signin')} />
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-gray-900/50 border-r border-gray-800/60 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">FBR GraphAI</p>
              <p className="text-[10px] text-gray-500 leading-none">Tax Compliance Intelligence</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); if (id !== 'persons') setSelectedCnic(null) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        {/* Stats summary */}
        {stats && (
          <div className="px-4 pb-2 space-y-2">
            <div className="card p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>High Risk</span>
                <span className="text-red-400 font-semibold">{stats.high_risk_count}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Non-Filers</span>
                <span className="text-amber-400 font-semibold">{stats.non_filers_count}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Avg Score</span>
                <span className="text-blue-400 font-semibold">{stats.avg_deviation_score}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-1">
              <Activity size={11} className="text-emerald-400 animate-pulse-slow" />
              <span className="text-[10px] text-gray-600">Live Analysis · {stats.total_persons} records</span>
            </div>
          </div>
        )}

        {/* User + Sign Out */}
        <div className="px-3 py-3 border-t border-gray-800/60">
          {/* Dark / Light toggle */}
          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
            <span className="text-[11px] text-gray-500">Appearance</span>
            <button
              onClick={() => setIsDark(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-800/60 text-gray-400 hover:text-gray-200 hover:bg-gray-700/60 transition-all border border-gray-700/50"
            >
              {isDark ? <Sun size={12} /> : <Moon size={12} />}
              {isDark ? 'Light' : 'Dark'}
            </button>
          </div>

          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center shrink-0">
              <User size={13} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">{user.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="text-gray-500 hover:text-red-400 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-[#060912]/80 backdrop-blur border-b border-gray-800/60 px-6 py-3.5 flex items-center gap-2 text-xs text-gray-500">
          <Shield size={12} className="text-blue-400" />
          <span className="text-blue-400">FBR Tax Compliance</span>
          <ChevronRight size={12} />
          <span className="text-gray-300 capitalize">
            {tab === 'persons' && selectedCnic ? 'Individual Detail' : tab}
          </span>
        </header>

        <div className="px-6 py-6 max-w-7xl mx-auto">
          {tab === 'dashboard' && stats && (
            <Dashboard stats={stats} onSelectPerson={handleSelectPerson} />
          )}

          {tab === 'persons' && !selectedCnic && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">Individuals Registry</h2>
              <PersonsTable onSelect={setSelectedCnic} />
            </div>
          )}

          {tab === 'persons' && selectedCnic && (
            <PersonDetail cnic={selectedCnic} onBack={() => setSelectedCnic(null)} />
          )}

          {tab === 'entities' && (
            <EntityMatches onSelectPerson={handleSelectPerson} />
          )}

          {tab === 'submit' && (
            <SubmitPersonForm
              onSuccess={(cnic) => {
                refreshStats()
                setSelectedCnic(cnic)
                setTab('persons')
              }}
              onDashboard={() => {
                refreshStats()
                setTab('dashboard')
              }}
            />
          )}
        </div>
      </main>
    </div>
  )
}
