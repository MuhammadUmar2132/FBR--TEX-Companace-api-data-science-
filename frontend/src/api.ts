import axios from 'axios'
import type { Stats, PersonsResponse, PersonDetail, GraphData, EntityMatch } from './types'

const api = axios.create({ baseURL: '/api' })

export const getStats = () => api.get<Stats>('/stats').then(r => r.data)

export const getPersons = (params: {
  city?: string
  risk_level?: string
  filing_status?: string
  search?: string
  min_score?: number
  page?: number
  page_size?: number
}) => api.get<PersonsResponse>('/persons', { params }).then(r => r.data)

export const getPerson = (cnic: string) =>
  api.get<PersonDetail>(`/persons/${encodeURIComponent(cnic)}`).then(r => r.data)

export const getGraph = (cnic: string) =>
  api.get<GraphData>(`/graph/${encodeURIComponent(cnic)}`).then(r => r.data)

export const getEntityMatches = (min_similarity = 78) =>
  api.get<{ count: number; matches: EntityMatch[] }>('/entity-matches', { params: { min_similarity } }).then(r => r.data)

export const getAnomalies = () =>
  api.get<{ count: number; anomalies: unknown[] }>('/anomalies').then(r => r.data)

export const deletePerson = (cnic: string) =>
  api.delete(`/persons/${encodeURIComponent(cnic)}`).then(r => r.data)

export const explainPerson = (cnic: string) =>
  api.get(`/explain/${encodeURIComponent(cnic)}`).then(r => r.data)

export const getNetwork = (cnic: string) =>
  api.get(`/network/${encodeURIComponent(cnic)}`).then(r => r.data)

export const authRegister = (name: string, email: string, password: string) =>
  api.post<{ id: number; name: string; email: string }>('/auth/register', { name, email, password }).then(r => r.data)

export const authLogin = (email: string, password: string) =>
  api.post<{ id: number; name: string; email: string }>('/auth/login', { email, password }).then(r => r.data)
