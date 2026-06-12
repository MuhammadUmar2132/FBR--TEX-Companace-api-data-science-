export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW'
export type FilingStatus = 'filed' | 'non_filer' | 'zero_return' | 'unknown'

export interface PersonSummary {
  cnic: string
  name: string
  address: string
  city: string
  dob: string
  phone: string
  profile_type: string
  compliance_score: number
  risk_level: RiskLevel
  filing_status: FilingStatus
  declared_income: number
  findings_count: number
  vehicle_count: number
  property_count: number
  is_user_submitted?: boolean
}

export interface Vehicle {
  registration_no: string
  cnic: string
  make: string
  model: string
  year: number
  engine_cc: number
  value_pkr: number
}

export interface UtilityBill {
  account_no: string
  cnic: string
  monthly_avg_pkr: number
  address: string
  utility_type: string
}

export interface TaxReturn {
  cnic: string
  year: number
  declared_income: number
  tax_paid: number
  filing_status: FilingStatus
}

export interface Property {
  deed_no: string
  cnic: string
  address: string
  area_sqft: number
  value_pkr: number
  transaction_type: string
}

export interface TravelLog {
  passport_no: string
  cnic: string
  trips_per_year: number
  destinations: string[]
  business_class: boolean
}

export interface Finding {
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  evidence: Record<string, unknown>
  score_contribution: number
}

export interface Score {
  cnic: string
  compliance_score: number
  risk_level: RiskLevel
  estimated_wealth_indicator: number
  declared_income: number
  filing_status: FilingStatus
  vehicle_value_total: number
  property_value_total: number
  annual_utility_cost: number
  travel_cost_estimate: number
  findings: Finding[]
}

export interface PersonDetail {
  person: {
    cnic: string
    name: string
    address: string
    city: string
    dob: string
    phone: string
    profile_type: string
  }
  vehicles: Vehicle[]
  utility_bills: UtilityBill[]
  tax_returns: TaxReturn[]
  properties: Property[]
  travel_logs: TravelLog[]
  score: Score
}

export interface GraphNode {
  id: string
  type: 'person' | 'vehicle' | 'property' | 'utility' | 'tax_return' | 'travel'
  label: string
  properties: Record<string, unknown>
  risk_level: 'high' | 'medium' | 'low'
}

export interface GraphEdge {
  source: string
  target: string
  relationship: string
  weight: number
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface Stats {
  total_persons: number
  high_risk_count: number
  medium_risk_count: number
  low_risk_count: number
  non_filers_count: number
  zero_return_count: number
  total_potential_tax_gap_pkr: number
  avg_deviation_score: number
  flagged_persons: (PersonSummary & { findings_count: number })[]
  score_distribution: Record<string, number>
  city_risk: Record<string, Record<string, number>>
  entity_matches_found: number
  total_vehicles: number
  total_properties: number
}

export interface PersonsResponse {
  total: number
  page: number
  page_size: number
  pages: number
  results: PersonSummary[]
}

export interface EntityMatch {
  cnic1: string
  name1: string
  city1: string
  cnic2: string
  name2: string
  city2: string
  name_similarity: number
  addr_similarity: number
  match_type: string
}
