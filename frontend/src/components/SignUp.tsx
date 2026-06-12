import { useState } from 'react'
import { Shield, Eye, EyeOff, UserPlus } from 'lucide-react'
import { authRegister } from '../api'

interface Props {
  onSignUp: (user: { name: string; email: string }) => void
  onGoSignIn: () => void
}

export default function SignUp({ onSignUp, onGoSignIn }: Props) {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password kam az kam 6 characters ka hona chahiye.')
      return
    }
    if (password !== confirm) {
      setError('Passwords match nahi kar rahe.')
      return
    }

    setLoading(true)
    try {
      const user = await authRegister(name, email, password)
      localStorage.setItem('fbr_session', JSON.stringify({ name: user.name, email: user.email }))
      onSignUp({ name: user.name, email: user.email })
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Registration mein masla aaya. Dobara koshish karein.')
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
          <h2 className="text-base font-semibold text-gray-200 mb-5">Account Banayein</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Naam</label>
              <input
                type="text"
                className="input w-full"
                placeholder="Aapka naam"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

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
                  placeholder="Min 6 characters"
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

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Password Confirm</label>
              <input
                type={showPass ? 'text' : 'password'}
                className="input w-full"
                placeholder="Password dobara likhein"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-1 disabled:opacity-60">
              <UserPlus size={15} />
              {loading ? 'Account ban raha hai...' : 'Account Banayein'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          Pehle se account hai?{' '}
          <button onClick={onGoSignIn} className="text-blue-400 hover:text-blue-300 font-medium">
            Sign In karein
          </button>
        </p>
      </div>
    </div>
  )
}
