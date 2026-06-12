import { useState } from 'react'
import { Plus, Trash2, Send, ChevronDown, ChevronUp, CheckCircle, AlertCircle, X } from 'lucide-react'
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta']
const FILING_STATUSES = ['filed', 'non_filer', 'zero_return']
const TRANSACTION_TYPES = ['purchase', 'inherited', 'gift']
const UTILITY_TYPES = ['Electricity', 'Gas']
const DESTINATIONS = ['Dubai', 'London', 'New York', 'Istanbul', 'Bangkok', 'Kuala Lumpur', 'Singapore', 'Paris', 'Toronto', 'Sydney', 'Riyadh', 'Doha']

interface SubmitResult {
  cnic: string
  name: string
  compliance_score: number
  risk_level: string
  findings_count: number
}

export default function SubmitPersonForm({ onSuccess, onDashboard }: { onSuccess?: (cnic: string) => void; onDashboard?: () => void }) {
  const [person, setPerson] = useState({ cnic: '', name: '', address: '', city: 'Lahore', dob: '', phone: '' })
  const [vehicles, setVehicles] = useState<any[]>([])
  const [utilityBills, setUtilityBills] = useState<any[]>([])
  const [taxReturns, setTaxReturns] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [travelLogs, setTravelLogs] = useState<any[]>([])

  const [openSection, setOpenSection] = useState<string>('person')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggle = (s: string) => setOpenSection(prev => prev === s ? '' : s)

  // ── Helpers ──────────────────────────────────────────────────
  const addVehicle = () => setVehicles(v => [...v, { registration_no: '', make: '', model: '', year: 2022, engine_cc: 1300, value_pkr: 0 }])
  const addBill = () => setUtilityBills(b => [...b, { account_no: '', monthly_avg_pkr: 0, utility_type: 'Electricity' }])
  const addReturn = () => setTaxReturns(r => [...r, { year: 2024, declared_income: 0, tax_paid: 0, filing_status: 'filed' }])
  const addProperty = () => setProperties(p => [...p, { deed_no: '', address: '', area_sqft: 0, value_pkr: 0, transaction_type: 'purchase' }])
  const addTravel = () => setTravelLogs(t => [...t, { passport_no: '', trips_per_year: 1, destinations: [], business_class: false }])

  const update = (setter: any, idx: number, key: string, val: any) =>
    setter((prev: any[]) => prev.map((item, i) => i === idx ? { ...item, [key]: val } : item))

  const remove = (setter: any, idx: number) =>
    setter((prev: any[]) => prev.filter((_: any, i: number) => i !== idx))

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null)
    setResult(null)
    if (!person.cnic || !person.name || !person.address || !person.dob || !person.phone) {
      setError('Person ki tamam fields zaruri hain (CNIC, Naam, Address, DOB, Phone)')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/submit', {
        person,
        vehicles,
        utility_bills: utilityBills,
        tax_returns: taxReturns,
        properties,
        travel_logs: travelLogs,
      })
      setResult(res.data)
      if (onSuccess) onSuccess(res.data.cnic)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Submit karne mein error aaya. Dobara try karein.')
    } finally {
      setLoading(false)
    }
  }

  const riskColor = (r: string) => r === 'HIGH' ? 'text-red-400' : r === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'

  if (result) {
    return (
      <div className="card p-8 text-center space-y-5 max-w-lg mx-auto">
        <CheckCircle size={48} className="text-emerald-400 mx-auto" />
        <div>
          <h3 className="text-xl font-bold text-white">{result.name}</h3>
          <p className="text-gray-400 text-sm mt-1">CNIC: {result.cnic}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-white">{result.compliance_score}</p>
            <p className="text-xs text-gray-500 mt-0.5">Risk Score</p>
          </div>
          <div className="card p-3 text-center">
            <p className={`text-lg font-bold ${riskColor(result.risk_level)}`}>{result.risk_level}</p>
            <p className="text-xs text-gray-500 mt-0.5">Risk Level</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-white">{result.findings_count}</p>
            <p className="text-xs text-gray-500 mt-0.5">Findings</p>
          </div>
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => { setResult(null); setPerson({ cnic: '', name: '', address: '', city: 'Lahore', dob: '', phone: '' }); setVehicles([]); setUtilityBills([]); setTaxReturns([]); setProperties([]); setTravelLogs([]) }}
            className="px-4 py-2 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Naya Record Submit Karein
          </button>
          {onDashboard && (
            <button
              onClick={onDashboard}
              className="px-4 py-2 text-sm bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Dashboard Dekhen
            </button>
          )}
          {onSuccess && (
            <button
              onClick={() => onSuccess(result.cnic)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              Detail Dekhein
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Naya Record Submit Karein</h2>
        <span className="text-xs text-gray-500">* zaruri fields</span>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Person ── */}
      <Section title="Shakhs ki Maloomat *" open={openSection === 'person'} onToggle={() => toggle('person')}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CNIC *">
            <input value={person.cnic} onChange={e => setPerson({ ...person, cnic: e.target.value })} placeholder="35201-1234567-8" className="input" />
          </Field>
          <Field label="Poora Naam *">
            <input value={person.name} onChange={e => setPerson({ ...person, name: e.target.value })} placeholder="Muhammad Ali" className="input" />
          </Field>
          <Field label="Address *" className="col-span-2">
            <input value={person.address} onChange={e => setPerson({ ...person, address: e.target.value })} placeholder="House 5, Street 3, DHA Phase 5" className="input" />
          </Field>
          <Field label="Shehar *">
            <select value={person.city} onChange={e => setPerson({ ...person, city: e.target.value })} className="input">
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Paidaish ki Taareekh *">
            <input type="date" value={person.dob} onChange={e => setPerson({ ...person, dob: e.target.value })} className="input" />
          </Field>
          <Field label="Phone *">
            <input value={person.phone} onChange={e => setPerson({ ...person, phone: e.target.value })} placeholder="0300-1234567" className="input" />
          </Field>
        </div>
      </Section>

      {/* ── Vehicles ── */}
      <Section title={`Gaadi / Vehicles (${vehicles.length})`} open={openSection === 'vehicles'} onToggle={() => toggle('vehicles')}>
        {vehicles.map((v, i) => (
          <div key={i} className="grid grid-cols-3 gap-3 p-3 bg-gray-800/30 rounded-lg relative">
            <button onClick={() => remove(setVehicles, i)} className="absolute top-2 right-2 text-gray-600 hover:text-red-400"><X size={14} /></button>
            <Field label="Registration No">
              <input value={v.registration_no} onChange={e => update(setVehicles, i, 'registration_no', e.target.value)} placeholder="LHR-123-4567" className="input" />
            </Field>
            <Field label="Make">
              <input value={v.make} onChange={e => update(setVehicles, i, 'make', e.target.value)} placeholder="Toyota" className="input" />
            </Field>
            <Field label="Model">
              <input value={v.model} onChange={e => update(setVehicles, i, 'model', e.target.value)} placeholder="Corolla" className="input" />
            </Field>
            <Field label="Saal">
              <input type="number" value={v.year} onChange={e => update(setVehicles, i, 'year', +e.target.value)} className="input" />
            </Field>
            <Field label="Engine CC">
              <input type="number" value={v.engine_cc} onChange={e => update(setVehicles, i, 'engine_cc', +e.target.value)} className="input" />
            </Field>
            <Field label="Qeemat (PKR)">
              <input type="number" value={v.value_pkr} onChange={e => update(setVehicles, i, 'value_pkr', +e.target.value)} className="input" />
            </Field>
          </div>
        ))}
        <button onClick={addVehicle} className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-700 rounded-lg text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm transition-colors">
          <Plus size={14} /> Gaadi Add Karein
        </button>
      </Section>

      {/* ── Utility Bills ── */}
      <Section title={`Utility Bills (${utilityBills.length})`} open={openSection === 'bills'} onToggle={() => toggle('bills')}>
        {utilityBills.map((b, i) => (
          <div key={i} className="grid grid-cols-3 gap-3 p-3 bg-gray-800/30 rounded-lg relative">
            <button onClick={() => remove(setUtilityBills, i)} className="absolute top-2 right-2 text-gray-600 hover:text-red-400"><X size={14} /></button>
            <Field label="Account No">
              <input value={b.account_no} onChange={e => update(setUtilityBills, i, 'account_no', e.target.value)} placeholder="WAPDA-1234567" className="input" />
            </Field>
            <Field label="Monthly Avg (PKR)">
              <input type="number" value={b.monthly_avg_pkr} onChange={e => update(setUtilityBills, i, 'monthly_avg_pkr', +e.target.value)} className="input" />
            </Field>
            <Field label="Qisam">
              <select value={b.utility_type} onChange={e => update(setUtilityBills, i, 'utility_type', e.target.value)} className="input">
                {UTILITY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
        ))}
        <button onClick={addBill} className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-700 rounded-lg text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm transition-colors">
          <Plus size={14} /> Bill Add Karein
        </button>
      </Section>

      {/* ── Tax Returns ── */}
      <Section title={`Tax Returns (${taxReturns.length})`} open={openSection === 'tax'} onToggle={() => toggle('tax')}>
        {taxReturns.map((r, i) => (
          <div key={i} className="grid grid-cols-4 gap-3 p-3 bg-gray-800/30 rounded-lg relative">
            <button onClick={() => remove(setTaxReturns, i)} className="absolute top-2 right-2 text-gray-600 hover:text-red-400"><X size={14} /></button>
            <Field label="Saal">
              <input type="number" value={r.year} onChange={e => update(setTaxReturns, i, 'year', +e.target.value)} className="input" />
            </Field>
            <Field label="Declared Income (PKR)">
              <input type="number" value={r.declared_income} onChange={e => update(setTaxReturns, i, 'declared_income', +e.target.value)} className="input" />
            </Field>
            <Field label="Tax Paid (PKR)">
              <input type="number" value={r.tax_paid} onChange={e => update(setTaxReturns, i, 'tax_paid', +e.target.value)} className="input" />
            </Field>
            <Field label="Status">
              <select value={r.filing_status} onChange={e => update(setTaxReturns, i, 'filing_status', e.target.value)} className="input">
                {FILING_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        ))}
        <button onClick={addReturn} className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-700 rounded-lg text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm transition-colors">
          <Plus size={14} /> Tax Return Add Karein
        </button>
      </Section>

      {/* ── Properties ── */}
      <Section title={`Jaidad / Properties (${properties.length})`} open={openSection === 'props'} onToggle={() => toggle('props')}>
        {properties.map((p, i) => (
          <div key={i} className="grid grid-cols-3 gap-3 p-3 bg-gray-800/30 rounded-lg relative">
            <button onClick={() => remove(setProperties, i)} className="absolute top-2 right-2 text-gray-600 hover:text-red-400"><X size={14} /></button>
            <Field label="Deed No">
              <input value={p.deed_no} onChange={e => update(setProperties, i, 'deed_no', e.target.value)} placeholder="DED-1234567" className="input" />
            </Field>
            <Field label="Address" className="col-span-2">
              <input value={p.address} onChange={e => update(setProperties, i, 'address', e.target.value)} placeholder="Plot 10, DHA Phase 5, Lahore" className="input" />
            </Field>
            <Field label="Area (sqft)">
              <input type="number" value={p.area_sqft} onChange={e => update(setProperties, i, 'area_sqft', +e.target.value)} className="input" />
            </Field>
            <Field label="Qeemat (PKR)">
              <input type="number" value={p.value_pkr} onChange={e => update(setProperties, i, 'value_pkr', +e.target.value)} className="input" />
            </Field>
            <Field label="Transaction">
              <select value={p.transaction_type} onChange={e => update(setProperties, i, 'transaction_type', e.target.value)} className="input">
                {TRANSACTION_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
        ))}
        <button onClick={addProperty} className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-700 rounded-lg text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm transition-colors">
          <Plus size={14} /> Jaidad Add Karein
        </button>
      </Section>

      {/* ── Travel ── */}
      <Section title={`Safar / Travel (${travelLogs.length})`} open={openSection === 'travel'} onToggle={() => toggle('travel')}>
        {travelLogs.map((t, i) => (
          <div key={i} className="p-3 bg-gray-800/30 rounded-lg relative space-y-3">
            <button onClick={() => remove(setTravelLogs, i)} className="absolute top-2 right-2 text-gray-600 hover:text-red-400"><X size={14} /></button>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Passport No">
                <input value={t.passport_no} onChange={e => update(setTravelLogs, i, 'passport_no', e.target.value)} placeholder="AB1234567" className="input" />
              </Field>
              <Field label="Trips/Year">
                <input type="number" value={t.trips_per_year} onChange={e => update(setTravelLogs, i, 'trips_per_year', +e.target.value)} className="input" />
              </Field>
              <Field label="Business Class">
                <select value={t.business_class ? 'han' : 'nahi'} onChange={e => update(setTravelLogs, i, 'business_class', e.target.value === 'han')} className="input">
                  <option value="nahi">Nahi</option>
                  <option value="han">Han</option>
                </select>
              </Field>
            </div>
            <Field label="Destinations (select multiple)">
              <div className="flex flex-wrap gap-2">
                {DESTINATIONS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      const dests: string[] = t.destinations.includes(d)
                        ? t.destinations.filter((x: string) => x !== d)
                        : [...t.destinations, d]
                      update(setTravelLogs, i, 'destinations', dests)
                    }}
                    className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                      t.destinations.includes(d)
                        ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
                        : 'border-gray-700 text-gray-500 hover:border-gray-500'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        ))}
        <button onClick={addTravel} className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-700 rounded-lg text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm transition-colors">
          <Plus size={14} /> Safar Record Add Karein
        </button>
      </Section>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        <Send size={16} />
        {loading ? 'Submit ho raha hai...' : 'Submit Karein & Risk Score Dekhen'}
      </button>
    </div>
  )
}

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors">
        {title}
        {open ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-xs text-gray-500">{label}</label>
      {children}
    </div>
  )
}
