import { useState } from 'react'
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react'
import { authLogin } from '../api'

interface Props {
  onSignIn: (user: { name: string; email: string }) => void
  onGoSignUp: () => void
}

export default function SignIn({ onSignIn, onGoSignUp }: Props) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await authLogin(email, password)
      localStorage.setItem('fbr_session', JSON.stringify({ name: user.name, email: user.email }))
      onSignIn({ name: user.name, email: user.email })
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Login mein masla aaya. Dobara koshish karein.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060912] px-4">
      <div className="w-full max-w-sm animate-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center glow-blue">
            <Shield size={22} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">FBR GraphAI</h1>
            <p className="text-xs text-gray-500 mt-0.5">Tax Compliance Intelligence</p>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-200 mb-5">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Email</label>
              <input
                type="email"
                className="input w-full"
                placeholder="aapka@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input w-full pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-1 disabled:opacity-60">
              <LogIn size={15} />
              {loading ? 'Sign In ho raha hai...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          Account nahi hai?{' '}
          <button onClick={onGoSignUp} className="text-blue-400 hover:text-blue-300 font-medium">
            Sign Up karein
          </button>
        </p>
      </div>
    </div>
  )
}
