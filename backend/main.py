from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import random
import numpy as np
from rapidfuzz import fuzz
import networkx as nx
from collections import defaultdict
import sqlite3
import hashlib
import secrets
import os


# ─────────────────────────────────────────────
# AUTH DATABASE  (SQLite)
# ─────────────────────────────────────────────

DB_PATH = os.path.join(os.path.dirname(__file__), "users.db")


def _get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db():
    conn = _get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            name     TEXT    NOT NULL,
            email    TEXT    NOT NULL UNIQUE,
            pw_hash  TEXT    NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS submitted_persons (
            cnic TEXT PRIMARY KEY, name TEXT, address TEXT,
            city TEXT, dob TEXT, phone TEXT,
            profile_type TEXT DEFAULT 'user_submitted'
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS submitted_vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cnic TEXT, registration_no TEXT, make TEXT, model TEXT,
            year INTEGER, engine_cc INTEGER, value_pkr INTEGER
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS submitted_utility_bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cnic TEXT, account_no TEXT, monthly_avg_pkr INTEGER,
            address TEXT, utility_type TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS submitted_tax_returns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cnic TEXT, year INTEGER, declared_income INTEGER,
            tax_paid INTEGER, filing_status TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS submitted_properties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cnic TEXT, deed_no TEXT, address TEXT,
            area_sqft INTEGER, value_pkr INTEGER, transaction_type TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS submitted_travel_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cnic TEXT, passport_no TEXT, trips_per_year INTEGER,
            destinations TEXT, business_class INTEGER
        )
    """)
    conn.commit()
    conn.close()


def _load_submitted_from_db():
    """Load all previously submitted persons from DB into in-memory DATA."""
    import json as _json
    conn = _get_db()
    for row in conn.execute("SELECT * FROM submitted_persons").fetchall():
        p = dict(row)
        if p["cnic"] not in BY_CNIC:
            BY_CNIC[p["cnic"]] = p
            DATA["persons"].append(p)
    for row in conn.execute("SELECT * FROM submitted_vehicles").fetchall():
        r = dict(row); r.pop("id", None)
        DATA["vehicles"].append(r)
    for row in conn.execute("SELECT * FROM submitted_utility_bills").fetchall():
        r = dict(row); r.pop("id", None)
        DATA["utility_bills"].append(r)
    for row in conn.execute("SELECT * FROM submitted_tax_returns").fetchall():
        r = dict(row); r.pop("id", None)
        DATA["tax_returns"].append(r)
    for row in conn.execute("SELECT * FROM submitted_properties").fetchall():
        r = dict(row); r.pop("id", None)
        DATA["properties"].append(r)
    for row in conn.execute("SELECT * FROM submitted_travel_logs").fetchall():
        r = dict(row); r.pop("id", None)
        if isinstance(r.get("destinations"), str):
            r["destinations"] = _json.loads(r["destinations"])
        r["business_class"] = bool(r["business_class"])
        DATA["travel_logs"].append(r)
    conn.close()


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{h}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt, h = stored.split(":", 1)
        return hashlib.sha256((salt + password).encode()).hexdigest() == h
    except Exception:
        return False


_init_db()


# ─────────────────────────────────────────────
# AUTH MODELS
# ─────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str     = Field(..., example="Muhammad Ali")
    email: str    = Field(..., example="ali@example.com")
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: str    = Field(..., example="ali@example.com")
    password: str = Field(...)


# ─────────────────────────────────────────────
# INPUT MODELS (User-submitted data)
# ─────────────────────────────────────────────

class PersonInput(BaseModel):
    cnic: str = Field(..., example="35201-1234567-8", description="CNIC format: XXXXX-XXXXXXX-X")
    name: str = Field(..., example="Muhammad Ali")
    address: str = Field(..., example="House 5, Street 3, DHA Phase 5, Lahore")
    city: str = Field(..., example="Lahore")
    dob: str = Field(..., example="1985-06-15", description="Date of birth YYYY-MM-DD")
    phone: str = Field(..., example="0300-1234567")

class VehicleInput(BaseModel):
    registration_no: str = Field(..., example="LHR-123-4567")
    make: str = Field(..., example="Toyota")
    model: str = Field(..., example="Corolla")
    year: int = Field(..., example=2022)
    engine_cc: int = Field(..., example=1800)
    value_pkr: int = Field(..., example=6500000)

class UtilityBillInput(BaseModel):
    account_no: str = Field(..., example="WAPDA-1234567")
    monthly_avg_pkr: int = Field(..., example=25000)
    utility_type: str = Field("Electricity", example="Electricity")

class TaxReturnInput(BaseModel):
    year: int = Field(..., example=2024)
    declared_income: int = Field(..., example=1200000)
    tax_paid: int = Field(..., example=60000)
    filing_status: str = Field(..., example="filed", description="filed / non_filer / zero_return")

class PropertyInput(BaseModel):
    deed_no: str = Field(..., example="DED-1234567")
    address: str = Field(..., example="Plot 10, DHA Phase 5, Lahore")
    area_sqft: int = Field(..., example=4000)
    value_pkr: int = Field(..., example=12000000)
    transaction_type: str = Field("purchase", example="purchase", description="purchase / inherited / gift")

class TravelInput(BaseModel):
    passport_no: str = Field(..., example="AB1234567")
    trips_per_year: int = Field(..., example=3)
    destinations: List[str] = Field(..., example=["Dubai", "London"])
    business_class: bool = Field(False, example=False)

class FullPersonSubmission(BaseModel):
    person: PersonInput
    vehicles: List[VehicleInput] = []
    utility_bills: List[UtilityBillInput] = []
    tax_returns: List[TaxReturnInput] = []
    properties: List[PropertyInput] = []
    travel_logs: List[TravelInput] = []

app = FastAPI(title="Tax Compliance Graph AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# SYNTHETIC DATA GENERATION
# ─────────────────────────────────────────────

random.seed(42)
np.random.seed(42)

MALE_NAMES = [
    "Muhammad Ali", "Ahmed Hassan", "Usman Malik", "Bilal Khan", "Tariq Sheikh",
    "Khalid Mirza", "Imran Syed", "Adnan Qureshi", "Faisal Butt", "Hamid Akhtar",
    "Rashid Hussain", "Naveed Rizvi", "Shahid Hashmi", "Waqar Baig", "Asif Raza",
    "Kamran Abbasi", "Sohail Javed", "Junaid Anwar", "Fahad Aslam", "Omar Cheema",
    "Zeeshan Gill", "Waseem Toor", "Arif Bhatti", "Saeed Dogar", "Naeem Bajwa",
    "Javed Warraich", "Zubair Chatha", "Ibrahim Randhawa", "Hassan Chaudhry", "Ali Ahmad",
]
FEMALE_NAMES = [
    "Fatima Khan", "Ayesha Ahmed", "Zainab Sheikh", "Maryam Malik", "Sana Hussain",
    "Nadia Mirza", "Rabia Syed", "Hina Butt", "Amna Qureshi", "Saima Akhtar",
    "Uzma Rizvi", "Samia Hashmi", "Shazia Baig", "Bushra Raza", "Farah Abbasi",
    "Noor Javed", "Sadia Anwar", "Asma Aslam", "Lubna Cheema", "Rubina Gill",
]

CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta"]
AREAS = {
    "Karachi": ["DHA Phase 6", "Clifton Block 4", "Gulshan-e-Iqbal", "North Nazimabad", "PECHS", "Bahadurabad"],
    "Lahore": ["DHA Phase 5", "Gulberg III", "Model Town", "Johar Town", "Bahria Town", "Cantt"],
    "Islamabad": ["F-7/2", "F-10/3", "G-9/1", "E-7", "Bahria Town", "DHA Phase II"],
    "Rawalpindi": ["Saddar", "Chaklala Scheme 3", "Satellite Town", "PWD Housing"],
    "Faisalabad": ["D-Ground", "Madina Town", "Peoples Colony", "Ghulam Muhammad Abad"],
    "Multan": ["Cantt", "Gulgasht Colony", "Model Town", "Shah Rukn-e-Alam"],
    "Peshawar": ["Hayatabad Phase 5", "University Town", "Saddar", "Ring Road"],
    "Quetta": ["Satellite Town", "Cantt", "Jinnah Town", "Brewery Road"],
}

CAR_DATA = [
    ("Suzuki", "Alto", 660, 1_200_000),
    ("Suzuki", "Wagon R", 660, 1_800_000),
    ("Suzuki", "Cultus", 1000, 2_200_000),
    ("Suzuki", "Swift", 1300, 2_800_000),
    ("Honda", "City", 1200, 3_500_000),
    ("Honda", "Civic", 1500, 5_500_000),
    ("Toyota", "Corolla", 1800, 6_500_000),
    ("KIA", "Sportage", 2000, 8_500_000),
    ("Hyundai", "Tucson", 2000, 9_000_000),
    ("Honda", "CR-V", 2000, 11_000_000),
    ("Toyota", "Camry", 2500, 15_000_000),
    ("Toyota", "Fortuner", 2700, 18_000_000),
    ("Toyota", "Prado", 3000, 22_000_000),
    ("Toyota", "Land Cruiser", 4000, 40_000_000),
    ("BMW", "3 Series", 2000, 18_000_000),
    ("BMW", "5 Series", 2500, 28_000_000),
    ("BMW", "7 Series", 3000, 45_000_000),
    ("Mercedes", "C Class", 2000, 20_000_000),
    ("Mercedes", "E Class", 2500, 32_000_000),
    ("Mercedes", "S Class", 3500, 60_000_000),
    ("Audi", "A4", 2000, 19_000_000),
    ("Audi", "Q7", 3000, 35_000_000),
]

DESTINATIONS = ["Dubai", "London", "New York", "Istanbul", "Bangkok", "Kuala Lumpur",
                 "Singapore", "Paris", "Toronto", "Sydney", "Riyadh", "Doha"]


def fmt_cnic(n: int) -> str:
    s = str(n).zfill(13)
    return f"{s[:5]}-{s[5:12]}-{s[12]}"


def gen_phone() -> str:
    prefix = random.choice(["0300", "0301", "0302", "0303", "0311", "0312", "0321", "0333", "0345"])
    return f"{prefix}-{random.randint(1000000, 9999999):07d}"


def generate_dataset(n: int = 200) -> dict:
    persons, vehicles, bills, returns_, properties, travel = [], [], [], [], [], []
    used_cnics: set = set()
    names_pool = MALE_NAMES + FEMALE_NAMES

    for i in range(n):
        while True:
            raw = random.randint(1111111111111, 9999999999999)
            cnic = fmt_cnic(raw)
            if cnic not in used_cnics:
                used_cnics.add(cnic)
                break

        name = random.choice(names_pool)
        city = random.choice(CITIES)
        area = random.choice(AREAS[city])
        profile = random.choices(
            ["honest", "under_reporter", "non_filer", "high_risk"],
            weights=[0.22, 0.26, 0.26, 0.26],
        )[0]
        dob_year = random.randint(1960, 1992)

        person = {
            "cnic": cnic,
            "name": name,
            "address": f"House {random.randint(1,500)}, Street {random.randint(1,50)}, {area}, {city}",
            "city": city,
            "dob": f"{dob_year}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            "phone": gen_phone(),
            "profile_type": profile,
        }
        persons.append(person)

        # --- Vehicles ---
        if profile == "high_risk":
            n_veh, pool = random.randint(2, 4), CAR_DATA[9:]
        elif profile == "non_filer":
            n_veh, pool = random.randint(1, 3), CAR_DATA[6:]
        elif profile == "under_reporter":
            n_veh, pool = random.randint(1, 2), CAR_DATA[3:12]
        else:
            n_veh, pool = random.randint(0, 1), CAR_DATA[:8]

        for _ in range(n_veh):
            make, model, cc, base_val = random.choice(pool)
            actual_val = int(base_val * random.uniform(0.85, 1.25))
            abbr = city[:2].upper()
            vehicles.append({
                "registration_no": f"{abbr}-{random.randint(100,999)}-{random.randint(1000,9999)}",
                "cnic": cnic,
                "make": make,
                "model": model,
                "year": random.randint(2016, 2024),
                "engine_cc": cc,
                "value_pkr": actual_val,
            })

        # --- Utility bills ---
        if profile == "high_risk":
            monthly = random.randint(250_000, 900_000)
        elif profile == "non_filer":
            monthly = random.randint(80_000, 300_000)
        elif profile == "under_reporter":
            monthly = random.randint(30_000, 120_000)
        else:
            monthly = random.randint(5_000, 45_000)

        bills.append({
            "account_no": f"WAPDA-{random.randint(1000000, 9999999)}",
            "cnic": cnic,
            "monthly_avg_pkr": monthly,
            "address": person["address"],
            "utility_type": "Electricity",
        })
        if random.random() < 0.55:
            bills.append({
                "account_no": f"SSGC-{random.randint(100000, 999999)}",
                "cnic": cnic,
                "monthly_avg_pkr": int(monthly * random.uniform(0.08, 0.25)),
                "address": person["address"],
                "utility_type": "Gas",
            })

        # --- Tax returns ---
        if profile == "non_filer":
            status, income, tax = "non_filer", 0, 0
        elif profile == "high_risk":
            status = random.choice(["zero_return", "filed"])
            income = 0 if status == "zero_return" else random.randint(500_000, 2_000_000)
            tax = int(income * 0.08)
        elif profile == "under_reporter":
            status, income = "filed", random.randint(250_000, 750_000)
            tax = int(income * 0.05)
        else:
            status, income = "filed", random.randint(800_000, 10_000_000)
            tax = int(income * 0.15)

        for year in [2022, 2023, 2024]:
            v = random.randint(-40_000, 40_000)
            returns_.append({
                "cnic": cnic,
                "year": year,
                "declared_income": max(0, income + v),
                "tax_paid": max(0, tax + int(v * 0.1)),
                "filing_status": status,
            })

        # --- Properties ---
        if profile == "high_risk" or (profile != "honest" and random.random() < 0.45):
            n_props = random.randint(1, 3) if profile == "high_risk" else 1
            for _ in range(n_props):
                sqft = random.choice([4000, 6000, 8000, 12000, 20000] if profile == "high_risk" else [500, 1000, 2000, 4000])
                vpsf = random.randint(30_000, 100_000) if profile == "high_risk" else random.randint(10_000, 40_000)
                p_area = random.choice(AREAS[city])
                properties.append({
                    "deed_no": f"DED-{random.randint(1000000, 9999999)}",
                    "cnic": cnic,
                    "address": f"Plot {random.randint(1,500)}, {p_area}, {city}",
                    "area_sqft": sqft,
                    "value_pkr": sqft * vpsf,
                    "transaction_type": random.choice(["purchase", "inherited", "gift"]),
                })

        # --- Travel ---
        if profile == "high_risk":
            trips, biz = random.randint(6, 20), True
        elif profile in ["non_filer", "under_reporter"]:
            trips, biz = random.randint(2, 8), random.random() < 0.4
        else:
            trips, biz = random.randint(0, 3), False

        if trips > 0:
            dests = random.sample(DESTINATIONS, min(trips, len(DESTINATIONS)))
            travel.append({
                "passport_no": f"AB{random.randint(1000000, 9999999)}",
                "cnic": cnic,
                "trips_per_year": trips,
                "destinations": dests,
                "business_class": biz,
            })

    return {
        "persons": persons,
        "vehicles": vehicles,
        "utility_bills": bills,
        "tax_returns": returns_,
        "properties": properties,
        "travel_logs": travel,
    }


# ── Generate & index ──────────────────────────────────────────
DATA = generate_dataset(200)

BY_CNIC: Dict[str, dict] = {p["cnic"]: p for p in DATA["persons"]}
VEH_IDX: Dict[str, list] = defaultdict(list)
BILL_IDX: Dict[str, list] = defaultdict(list)
RET_IDX: Dict[str, list] = defaultdict(list)
PROP_IDX: Dict[str, list] = defaultdict(list)
TRAV_IDX: Dict[str, list] = defaultdict(list)

for r in DATA["vehicles"]:      VEH_IDX[r["cnic"]].append(r)
for r in DATA["utility_bills"]: BILL_IDX[r["cnic"]].append(r)
for r in DATA["tax_returns"]:   RET_IDX[r["cnic"]].append(r)
for r in DATA["properties"]:    PROP_IDX[r["cnic"]].append(r)
for r in DATA["travel_logs"]:   TRAV_IDX[r["cnic"]].append(r)

# Load previously submitted persons from DB
_load_submitted_from_db()


# ─────────────────────────────────────────────
# ENTITY RESOLUTION  (4-Layer Confidence Scoring)
# ─────────────────────────────────────────────
# Layer 1: Exact identifier match (phone / address token)
# Layer 2: RapidFuzz name similarity  (token_sort_ratio)
# Layer 3: Address similarity          (partial_ratio)
# Layer 4: Weighted confidence score   (name×0.50 + addr×0.35 + shared×0.15)

def _shared_asset_score(c1: str, c2: str) -> float:
    """Bonus when two persons share address tokens or phone prefix."""
    p1 = BY_CNIC.get(c1, {}); p2 = BY_CNIC.get(c2, {})
    score = 0.0
    # same phone prefix (operator + first 3 digits)
    if p1.get("phone", "")[:8] == p2.get("phone", "")[:8] and p1.get("phone"):
        score += 40
    # same city
    if p1.get("city") and p1.get("city") == p2.get("city"):
        score += 30
    # shared address street token
    a1_tokens = set(p1.get("address", "").lower().split())
    a2_tokens = set(p2.get("address", "").lower().split())
    common = a1_tokens & a2_tokens - {"house", "street", "block", "phase", "plot", "road", "sector"}
    score += min(30, len(common) * 8)
    return min(100.0, score)


def resolve_entities():
    names_index = [(p["cnic"], p["name"], p["address"], p["city"]) for p in DATA["persons"]]
    matches = []
    for i, (c1, n1, a1, city1) in enumerate(names_index):
        for j, (c2, n2, a2, city2) in enumerate(names_index):
            if i >= j:
                continue

            # Layer 2 – name
            ns = fuzz.token_sort_ratio(n1, n2)
            ns2 = fuzz.WRatio(n1, n2)
            name_score = max(ns, ns2)

            # Layer 3 – address
            as_ = fuzz.partial_ratio(a1, a2)
            as2 = fuzz.token_set_ratio(a1, a2)
            addr_score = max(as_, as2)

            # Layer 4 – shared asset / context bonus
            shared_score = _shared_asset_score(c1, c2)

            # Weighted confidence
            confidence = round(name_score * 0.50 + addr_score * 0.35 + shared_score * 0.15, 1)

            if name_score < 72:
                continue

            # Determine match type
            if name_score > 90:
                match_type = "strong_name_alias"
            elif name_score > 80 and addr_score > 75:
                match_type = "name_address_match"
            elif name_score > 72 and addr_score > 85 and city1 == city2:
                match_type = "same_locality"
            else:
                continue

            if confidence < 70:
                continue

            matches.append({
                "cnic1": c1, "name1": n1, "city1": city1,
                "cnic2": c2, "name2": n2, "city2": city2,
                "name_similarity": name_score,
                "addr_similarity": addr_score,
                "shared_context_score": shared_score,
                "confidence": confidence,
                "match_type": match_type,
                # Layer breakdown for explainability
                "layers": {
                    "L2_name": name_score,
                    "L3_address": addr_score,
                    "L4_shared_context": shared_score,
                },
            })

    matches.sort(key=lambda x: x["confidence"], reverse=True)
    return matches


ENTITY_MATCHES = resolve_entities()


# ─────────────────────────────────────────────
# SCORING ENGINE
# ─────────────────────────────────────────────

def score_person(cnic: str) -> dict:
    person = BY_CNIC.get(cnic)
    if not person:
        return {}

    vehs  = VEH_IDX.get(cnic, [])
    bills = BILL_IDX.get(cnic, [])
    rets  = sorted(RET_IDX.get(cnic, []), key=lambda x: x["year"], reverse=True)
    props = PROP_IDX.get(cnic, [])
    trvls = TRAV_IDX.get(cnic, [])

    latest = rets[0] if rets else {"declared_income": 0, "tax_paid": 0, "filing_status": "non_filer"}
    declared = latest["declared_income"]
    status   = latest["filing_status"]

    veh_val   = sum(v["value_pkr"] for v in vehs)
    prop_val  = sum(p["value_pkr"] for p in props)
    ann_util  = sum(b["monthly_avg_pkr"] * 12 for b in bills)
    trav_cost = sum(t["trips_per_year"] * (200_000 if t["business_class"] else 80_000) for t in trvls)

    wealth_indicator = veh_val * 0.15 + prop_val * 0.10 + ann_util + trav_cost

    findings = []
    score    = 0.0

    # 1. Filing status
    if status == "non_filer":
        score += 30
        findings.append({
            "category": "Tax Filing",
            "severity": "critical",
            "description": "Individual is a registered non-filer with no income tax return on record for FY 2022–2024.",
            "evidence": {"filing_status": "non_filer", "years_checked": [2022, 2023, 2024]},
            "score_contribution": 30.0,
        })
    elif status == "zero_return":
        score += 22
        findings.append({
            "category": "Tax Filing",
            "severity": "high",
            "description": "Filed a zero-income return while holding significant declared assets — classic under-reporting pattern.",
            "evidence": {"declared_income": declared, "filing_status": "zero_return"},
            "score_contribution": 22.0,
        })

    # 2. High-CC vehicles
    lux_vehs = [v for v in vehs if v["engine_cc"] >= 2000]
    if lux_vehs and declared < 2_000_000:
        contrib = min(25, len(lux_vehs) * 9 + veh_val / 8_000_000 * 5)
        score += contrib
        findings.append({
            "category": "Vehicle Assets",
            "severity": "high" if len(lux_vehs) > 1 else "medium",
            "description": (
                f"Owns {len(lux_vehs)} high-displacement vehicle(s) (≥2000cc). "
                f"Combined fleet value: PKR {veh_val:,}. "
                f"Declared annual income: PKR {declared:,}."
            ),
            "evidence": {
                "vehicles": [{"make": v["make"], "model": v["model"], "cc": v["engine_cc"], "value_pkr": v["value_pkr"]} for v in lux_vehs],
                "total_fleet_value": veh_val,
                "declared_income": declared,
            },
            "score_contribution": round(contrib, 2),
        })

    # 3. Electricity bill
    max_bill = max((b["monthly_avg_pkr"] for b in bills), default=0)
    if max_bill > 50_000 and declared < 1_500_000:
        contrib = min(20, (max_bill / 50_000) * 4)
        score += contrib
        findings.append({
            "category": "Utility Consumption",
            "severity": "high" if max_bill > 200_000 else "medium",
            "description": (
                f"Monthly electricity bill of PKR {max_bill:,} "
                f"(PKR {max_bill*12:,}/year) indicates a large or premium-grade establishment "
                f"inconsistent with declared income of PKR {declared:,}."
            ),
            "evidence": {"peak_monthly_bill_pkr": max_bill, "annual_equivalent": max_bill * 12, "declared_income": declared},
            "score_contribution": round(contrib, 2),
        })

    # 4. Real estate
    if props:
        if declared == 0 or status in ["non_filer", "zero_return"]:
            contrib = 18
            score += contrib
            findings.append({
                "category": "Real Estate Holdings",
                "severity": "high",
                "description": (
                    f"Non-filer / zero-return filer owns {len(props)} registered propert(ies) "
                    f"with total registry value PKR {prop_val:,}."
                ),
                "evidence": {"property_count": len(props), "total_value_pkr": prop_val, "filing_status": status},
                "score_contribution": contrib,
            })
        elif prop_val > declared * 4:
            ratio = prop_val / max(declared, 1)
            contrib = min(18, ratio * 1.5)
            score += contrib
            findings.append({
                "category": "Real Estate Holdings",
                "severity": "medium",
                "description": (
                    f"Property portfolio (PKR {prop_val:,}) is {ratio:.1f}× the annual declared income "
                    f"(PKR {declared:,}), suggesting undisclosed income sources."
                ),
                "evidence": {"property_count": len(props), "total_value_pkr": prop_val, "ratio_to_income": round(ratio, 2)},
                "score_contribution": round(contrib, 2),
            })

    # 5. Travel
    for t in trvls:
        if t["trips_per_year"] >= 4 and declared < 1_500_000:
            contrib = min(15, t["trips_per_year"] * 1.2)
            score += contrib
            biz_note = " (Business Class)" if t["business_class"] else ""
            findings.append({
                "category": "International Travel",
                "severity": "medium",
                "description": (
                    f"{t['trips_per_year']} international trips/year{biz_note} — "
                    f"destinations include {', '.join(t['destinations'][:4])}. "
                    f"Estimated annual travel spend: PKR {t['trips_per_year'] * (200_000 if t['business_class'] else 80_000):,}."
                ),
                "evidence": {
                    "trips_per_year": t["trips_per_year"],
                    "destinations": t["destinations"],
                    "business_class": t["business_class"],
                    "est_cost_pkr": t["trips_per_year"] * (200_000 if t["business_class"] else 80_000),
                },
                "score_contribution": round(contrib, 2),
            })
            break

    # 6. Wealth-Income mismatch
    if declared > 0 and wealth_indicator > declared * 2.5:
        ratio = wealth_indicator / declared
        contrib = min(15, ratio * 1.8)
        score += contrib
        findings.append({
            "category": "Wealth–Income Mismatch",
            "severity": "high",
            "description": (
                f"Estimated annual lifestyle expenditure (PKR {wealth_indicator:,.0f}) "
                f"is {ratio:.1f}× the declared income (PKR {declared:,}). "
                f"Gap signals significant undisclosed income."
            ),
            "evidence": {
                "estimated_annual_expenditure": round(wealth_indicator),
                "declared_income": declared,
                "mismatch_ratio": round(ratio, 2),
            },
            "score_contribution": round(contrib, 2),
        })

    score = min(100.0, score)
    risk = "HIGH" if score >= 65 else "MEDIUM" if score >= 35 else "LOW"

    return {
        "cnic": cnic,
        "compliance_score": round(score, 1),
        "risk_level": risk,
        "estimated_wealth_indicator": round(wealth_indicator),
        "declared_income": declared,
        "filing_status": status,
        "vehicle_value_total": veh_val,
        "property_value_total": prop_val,
        "annual_utility_cost": round(ann_util),
        "travel_cost_estimate": round(trav_cost),
        "findings": findings,
    }


SCORES: Dict[str, dict] = {c: score_person(c) for c in BY_CNIC}


# ─────────────────────────────────────────────
# KNOWLEDGE GRAPH BUILDER
# ─────────────────────────────────────────────

def build_graph(cnic: str) -> dict:
    person = BY_CNIC.get(cnic)
    if not person:
        return {"nodes": [], "edges": []}

    sc = SCORES.get(cnic, {})
    risk = sc.get("risk_level", "LOW").lower()
    nodes, edges = [], []

    nodes.append({
        "id": cnic,
        "type": "person",
        "label": person["name"],
        "properties": {"cnic": cnic, "city": person["city"], "dob": person["dob"], "phone": person["phone"]},
        "risk_level": risk,
    })

    for v in VEH_IDX.get(cnic, []):
        vid = f"VEH-{v['registration_no']}"
        rl = "high" if v["engine_cc"] >= 2000 else "medium" if v["engine_cc"] >= 1300 else "low"
        nodes.append({
            "id": vid, "type": "vehicle",
            "label": f"{v['make']} {v['model']}",
            "properties": {"reg": v["registration_no"], "year": v["year"], "cc": v["engine_cc"], "value_pkr": v["value_pkr"]},
            "risk_level": rl,
        })
        edges.append({"source": cnic, "target": vid, "relationship": "OWNS_VEHICLE", "weight": v["engine_cc"] / 1000})

    for p in PROP_IDX.get(cnic, []):
        pid = f"PROP-{p['deed_no']}"
        rl = "high" if p["value_pkr"] > 20_000_000 else "medium" if p["value_pkr"] > 5_000_000 else "low"
        nodes.append({
            "id": pid, "type": "property",
            "label": f"Property {p['area_sqft']:,} sqft",
            "properties": {"deed": p["deed_no"], "address": p["address"], "sqft": p["area_sqft"], "value_pkr": p["value_pkr"]},
            "risk_level": rl,
        })
        edges.append({"source": cnic, "target": pid, "relationship": "OWNS_PROPERTY", "weight": p["value_pkr"] / 10_000_000})

    for b in BILL_IDX.get(cnic, []):
        bid = f"UTIL-{b['account_no']}"
        rl = "high" if b["monthly_avg_pkr"] > 150_000 else "medium" if b["monthly_avg_pkr"] > 30_000 else "low"
        nodes.append({
            "id": bid, "type": "utility",
            "label": f"{b['utility_type']} Bill",
            "properties": {"account": b["account_no"], "monthly_pkr": b["monthly_avg_pkr"], "type": b["utility_type"]},
            "risk_level": rl,
        })
        edges.append({"source": cnic, "target": bid, "relationship": "HAS_UTILITY", "weight": 1.0})

    rets = sorted(RET_IDX.get(cnic, []), key=lambda x: x["year"], reverse=True)
    if rets:
        lat = rets[0]
        tid = f"TAX-{cnic[-4:]}-{lat['year']}"
        rl = "high" if lat["filing_status"] in ["non_filer", "zero_return"] else "low"
        nodes.append({
            "id": tid, "type": "tax_return",
            "label": f"Tax Return {lat['year']}",
            "properties": {"year": lat["year"], "declared_income": lat["declared_income"], "tax_paid": lat["tax_paid"], "status": lat["filing_status"]},
            "risk_level": rl,
        })
        edges.append({"source": cnic, "target": tid, "relationship": "FILED_RETURN", "weight": 1.0})

    for t in TRAV_IDX.get(cnic, []):
        trid = f"TRAVEL-{t['passport_no'][-6:]}"
        rl = "high" if t["trips_per_year"] >= 6 else "medium" if t["trips_per_year"] >= 3 else "low"
        nodes.append({
            "id": trid, "type": "travel",
            "label": f"{t['trips_per_year']} Int'l Trips/yr",
            "properties": {"passport": t["passport_no"], "trips": t["trips_per_year"], "destinations": t["destinations"], "biz_class": t["business_class"]},
            "risk_level": rl,
        })
        edges.append({"source": cnic, "target": trid, "relationship": "HAS_TRAVEL_RECORD", "weight": t["trips_per_year"] / 5})

    # Entity resolution links
    for m in ENTITY_MATCHES:
        related = None
        if m["cnic1"] == cnic:
            related = m["cnic2"]
        elif m["cnic2"] == cnic:
            related = m["cnic1"]
        if related and related != cnic:
            rp = BY_CNIC.get(related, {})
            rr = SCORES.get(related, {}).get("risk_level", "LOW").lower()
            if not any(nd["id"] == related for nd in nodes):
                nodes.append({
                    "id": related, "type": "person",
                    "label": rp.get("name", related),
                    "properties": {"cnic": related, "city": rp.get("city", "")},
                    "risk_level": rr,
                })
            edges.append({"source": cnic, "target": related, "relationship": "ENTITY_MATCH", "weight": 0.5})

    return {"nodes": nodes, "edges": edges}


# ─────────────────────────────────────────────
# API ROUTES
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "service": "Tax Compliance Graph AI", "version": "1.0.0"}


@app.get("/api/stats")
def get_stats():
    all_scores = list(SCORES.values())
    high = [s for s in all_scores if s["risk_level"] == "HIGH"]
    med  = [s for s in all_scores if s["risk_level"] == "MEDIUM"]
    low  = [s for s in all_scores if s["risk_level"] == "LOW"]
    nf   = [s for s in all_scores if s["filing_status"] == "non_filer"]
    zr   = [s for s in all_scores if s["filing_status"] == "zero_return"]

    top_flagged = sorted(
        [s for s in all_scores if s["risk_level"] in ["HIGH", "MEDIUM"]],
        key=lambda x: x["compliance_score"], reverse=True
    )[:25]
    flagged_enriched = []
    for s in top_flagged:
        p = BY_CNIC.get(s["cnic"], {})
        flagged_enriched.append({
            **s,
            "name": p.get("name", "—"),
            "city": p.get("city", "—"),
            "findings_count": len(s.get("findings", [])),
        })

    tax_gap = sum(
        max(0, s["estimated_wealth_indicator"] * 0.25 - s["declared_income"] * 0.15)
        for s in all_scores
    )

    dist = {
        "0-20": len([s for s in all_scores if s["compliance_score"] < 20]),
        "20-40": len([s for s in all_scores if 20 <= s["compliance_score"] < 40]),
        "40-60": len([s for s in all_scores if 40 <= s["compliance_score"] < 60]),
        "60-80": len([s for s in all_scores if 60 <= s["compliance_score"] < 80]),
        "80-100": len([s for s in all_scores if s["compliance_score"] >= 80]),
    }

    city_risk: dict = defaultdict(lambda: {"HIGH": 0, "MEDIUM": 0, "LOW": 0})
    for s in all_scores:
        p = BY_CNIC.get(s["cnic"], {})
        city_risk[p.get("city", "Unknown")][s["risk_level"]] += 1

    return {
        "total_persons": len(DATA["persons"]),
        "high_risk_count": len(high),
        "medium_risk_count": len(med),
        "low_risk_count": len(low),
        "non_filers_count": len(nf),
        "zero_return_count": len(zr),
        "total_potential_tax_gap_pkr": round(tax_gap),
        "avg_deviation_score": round(float(np.mean([s["compliance_score"] for s in all_scores])), 1),
        "flagged_persons": flagged_enriched,
        "score_distribution": dist,
        "city_risk": {k: dict(v) for k, v in city_risk.items()},
        "entity_matches_found": len(ENTITY_MATCHES),
        "total_vehicles": len(DATA["vehicles"]),
        "total_properties": len(DATA["properties"]),
    }


@app.get("/api/persons")
def list_persons(
    city: Optional[str] = None,
    risk_level: Optional[str] = None,
    filing_status: Optional[str] = None,
    search: Optional[str] = None,
    min_score: Optional[float] = None,
    page: int = 1,
    page_size: int = 20,
):
    results = []
    for p in DATA["persons"]:
        s = SCORES.get(p["cnic"], {})
        if city and p["city"].lower() != city.lower():
            continue
        if risk_level and s.get("risk_level", "").upper() != risk_level.upper():
            continue
        if filing_status and s.get("filing_status", "") != filing_status:
            continue
        if search:
            sl = search.lower()
            if sl not in p["name"].lower() and sl not in p["cnic"]:
                continue
        if min_score is not None and s.get("compliance_score", 0) < min_score:
            continue
        results.append({
            **p,
            "compliance_score": s.get("compliance_score", 0),
            "risk_level": s.get("risk_level", "LOW"),
            "filing_status": s.get("filing_status", "unknown"),
            "declared_income": s.get("declared_income", 0),
            "findings_count": len(s.get("findings", [])),
            "vehicle_count": len(VEH_IDX.get(p["cnic"], [])),
            "property_count": len(PROP_IDX.get(p["cnic"], [])),
        })
    results.sort(key=lambda x: x["compliance_score"], reverse=True)
    total = len(results)
    start = (page - 1) * page_size
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
        "results": results[start: start + page_size],
    }


@app.get("/api/persons/{cnic}")
def get_person(cnic: str):
    person = BY_CNIC.get(cnic)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return {
        "person": person,
        "vehicles": VEH_IDX.get(cnic, []),
        "utility_bills": BILL_IDX.get(cnic, []),
        "tax_returns": RET_IDX.get(cnic, []),
        "properties": PROP_IDX.get(cnic, []),
        "travel_logs": TRAV_IDX.get(cnic, []),
        "score": SCORES.get(cnic, {}),
    }


@app.get("/api/graph/{cnic}")
def get_graph(cnic: str):
    if cnic not in BY_CNIC:
        raise HTTPException(status_code=404, detail="Person not found")
    return build_graph(cnic)


@app.get("/api/entity-matches")
def get_entity_matches(min_similarity: float = 78):
    filtered = [m for m in ENTITY_MATCHES if m["name_similarity"] >= min_similarity]
    return {"count": len(filtered), "matches": filtered[:60]}


@app.get("/api/anomalies")
def get_anomalies():
    items = []
    for cnic, s in SCORES.items():
        if s["compliance_score"] > 45:
            p = BY_CNIC.get(cnic, {})
            primary = s["findings"][0]["description"][:120] + "…" if s.get("findings") else "No specific finding."
            items.append({
                "cnic": cnic,
                "name": p.get("name", ""),
                "city": p.get("city", ""),
                "compliance_score": s["compliance_score"],
                "risk_level": s["risk_level"],
                "primary_finding": primary,
                "findings_count": len(s["findings"]),
                "estimated_wealth": s["estimated_wealth_indicator"],
                "declared_income": s["declared_income"],
            })
    items.sort(key=lambda x: x["compliance_score"], reverse=True)
    return {"count": len(items), "anomalies": items[:50]}


# ─────────────────────────────────────────────
# AI COPILOT  – Plain-language investigation report
# ─────────────────────────────────────────────

def _pkr(n: int) -> str:
    if n >= 10_000_000: return f"PKR {n/10_000_000:.1f} Crore"
    if n >= 100_000:    return f"PKR {n/100_000:.1f} Lakh"
    return f"PKR {n:,}"


def _severity_label(s: str) -> str:
    return {"critical": "CRITICAL", "high": "HIGH", "medium": "MODERATE", "low": "LOW"}.get(s, s.upper())


def generate_copilot_report(cnic: str) -> dict:
    person = BY_CNIC.get(cnic)
    if not person:
        return {}

    sc = SCORES.get(cnic, {})
    score   = sc.get("compliance_score", 0)
    risk    = sc.get("risk_level", "LOW")
    status  = sc.get("filing_status", "unknown")
    declared = sc.get("declared_income", 0)
    wealth  = sc.get("estimated_wealth_indicator", 0)
    findings = sc.get("findings", [])

    vehs  = VEH_IDX.get(cnic, [])
    props = PROP_IDX.get(cnic, [])
    trvls = TRAV_IDX.get(cnic, [])
    bills = BILL_IDX.get(cnic, [])

    # ── Entity matches for this person ───────────────────────
    linked = [m for m in ENTITY_MATCHES if m["cnic1"] == cnic or m["cnic2"] == cnic]

    # ── Build narrative sections ──────────────────────────────
    risk_emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(risk, "")

    # Opening summary
    status_phrase = {
        "non_filer":    "a **registered non-filer** with no income tax return on record",
        "zero_return":  "a **zero-income return filer** despite holding substantial declared assets",
        "filed":        f"a tax filer with declared annual income of **{_pkr(declared)}**",
    }.get(status, "of unknown filing status")

    opening = (
        f"{person['name']} (CNIC: {cnic}) has been flagged as **{risk} RISK** "
        f"with a deviation score of **{score}/100**. "
        f"This individual is {status_phrase}. "
        f"Our cross-database analysis has identified **{len(findings)} compliance concern(s)** "
        f"across tax, asset, utility, and travel records."
    )

    # Evidence sections
    evidence_blocks = []

    for f in findings:
        sev = _severity_label(f["severity"])
        block = {
            "category": f["category"],
            "severity": f["severity"],
            "severity_label": sev,
            "score_contribution": f["score_contribution"],
            "headline": f["description"].split(".")[0] + ".",
            "detail": f["description"],
            "evidence": f["evidence"],
        }
        evidence_blocks.append(block)

    # Wealth gap analysis
    gap = max(0, wealth - declared)
    gap_ratio = round(wealth / max(declared, 1), 1)
    wealth_narrative = ""
    if wealth > 0:
        wealth_narrative = (
            f"Estimated annual lifestyle expenditure stands at **{_pkr(wealth)}**, "
            f"which is **{gap_ratio}× the declared income**. "
            f"The unexplained wealth gap is approximately **{_pkr(gap)}**. "
        )
        if gap > 5_000_000:
            wealth_narrative += (
                f"At the standard income tax rate of 25%, this gap represents a potential "
                f"tax liability of **{_pkr(int(gap * 0.25))}** per annum."
            )

    # Asset inventory
    asset_lines = []
    if vehs:
        lux = [v for v in vehs if v["engine_cc"] >= 2000]
        asset_lines.append(
            f"**{len(vehs)} vehicle(s)** registered (total value {_pkr(sum(v['value_pkr'] for v in vehs))})"
            + (f", including {len(lux)} luxury/high-displacement unit(s)" if lux else "")
        )
    if props:
        asset_lines.append(
            f"**{len(props)} propert(ies)** on record (total registry value {_pkr(sum(p['value_pkr'] for p in props))})"
        )
    max_bill = max((b["monthly_avg_pkr"] for b in bills), default=0)
    if max_bill > 0:
        asset_lines.append(f"Peak monthly utility bill of **{_pkr(max_bill)}** ({_pkr(max_bill*12)}/year)")
    for t in trvls:
        cls = "Business Class" if t["business_class"] else "Economy"
        dests = ", ".join(t["destinations"][:4])
        asset_lines.append(
            f"**{t['trips_per_year']} international trip(s)/year** ({cls}) to {dests}"
        )

    # Entity resolution findings
    entity_narrative = ""
    if linked:
        best = sorted(linked, key=lambda x: x["confidence"], reverse=True)[0]
        other_cnic = best["cnic2"] if best["cnic1"] == cnic else best["cnic1"]
        other_name = best["name2"] if best["cnic1"] == cnic else best["name1"]
        entity_narrative = (
            f"Entity resolution engine identified **{len(linked)} potential alias(es)**. "
            f"Highest confidence match: **{other_name}** (CNIC: {other_cnic}) "
            f"with **{best['confidence']}% confidence** "
            f"[Name similarity: {best['layers']['L2_name']}%, "
            f"Address similarity: {best['layers']['L3_address']}%, "
            f"Shared context: {best['layers']['L4_shared_context']}%]. "
            f"Match type: {best['match_type'].replace('_', ' ').title()}."
        )

    # Investigation recommendation
    if score >= 65:
        recommendation = (
            "**Immediate Investigation Recommended.** This case presents multiple high-severity "
            "indicators consistent with systematic tax evasion. Recommend: (1) Issue formal tax "
            "audit notice under Section 177 of the Income Tax Ordinance 2001, "
            "(2) Cross-verify asset declarations with NADRA, FBR, and provincial stamp authorities, "
            "(3) Freeze undisclosed asset transfers pending investigation."
        )
        priority = "P1 – Immediate"
    elif score >= 35:
        recommendation = (
            "**Further Scrutiny Required.** Selected indicators suggest under-reporting. "
            "Recommend: (1) Send compliance notice requesting income source justification, "
            "(2) Request bank statement for last 3 years, "
            "(3) Schedule for desk audit within 30 days."
        )
        priority = "P2 – Within 30 Days"
    else:
        recommendation = (
            "**Routine Monitoring.** No immediate action required. "
            "Flag for annual compliance review cycle."
        )
        priority = "P3 – Annual Review"

    return {
        "cnic": cnic,
        "name": person["name"],
        "city": person["city"],
        "risk_level": risk,
        "compliance_score": score,
        "investigation_priority": priority,
        "opening_summary": opening,
        "wealth_gap_analysis": wealth_narrative,
        "asset_inventory": asset_lines,
        "evidence_blocks": evidence_blocks,
        "entity_resolution_findings": entity_narrative,
        "investigation_recommendation": recommendation,
        "generated_at": "2026-06-12",
        "model": "FBR-GraphAI Explainability Engine v2.0",
    }


@app.get("/api/explain/{cnic}")
def explain_person(cnic: str):
    """AI Copilot: generates a plain-language investigation narrative for a given CNIC."""
    if cnic not in BY_CNIC:
        raise HTTPException(status_code=404, detail="Person not found")
    return generate_copilot_report(cnic)


# ─────────────────────────────────────────────
# NETWORK INTELLIGENCE  – Cluster & Connection Analysis
# ─────────────────────────────────────────────

@app.get("/api/network/{cnic}")
def get_network(cnic: str):
    """Returns all persons connected to this CNIC via entity resolution, with cluster risk."""
    if cnic not in BY_CNIC:
        raise HTTPException(status_code=404, detail="Person not found")

    # BFS through entity match graph
    visited = {cnic}
    frontier = {cnic}
    cluster_edges = []

    for _ in range(3):  # max 3 hops
        next_frontier = set()
        for m in ENTITY_MATCHES:
            c1, c2 = m["cnic1"], m["cnic2"]
            if c1 in frontier and c2 not in visited:
                next_frontier.add(c2)
                cluster_edges.append(m)
                visited.add(c2)
            elif c2 in frontier and c1 not in visited:
                next_frontier.add(c1)
                cluster_edges.append(m)
                visited.add(c1)
        frontier = next_frontier
        if not frontier:
            break

    cluster_members = []
    for c in visited:
        p = BY_CNIC.get(c, {})
        s = SCORES.get(c, {})
        cluster_members.append({
            "cnic": c,
            "name": p.get("name", ""),
            "city": p.get("city", ""),
            "compliance_score": s.get("compliance_score", 0),
            "risk_level": s.get("risk_level", "LOW"),
            "filing_status": s.get("filing_status", "unknown"),
            "is_root": c == cnic,
        })

    cluster_members.sort(key=lambda x: x["compliance_score"], reverse=True)

    scores_in_cluster = [s["compliance_score"] for s in cluster_members]
    high_count = sum(1 for m in cluster_members if m["risk_level"] == "HIGH")
    avg_score  = round(sum(scores_in_cluster) / max(len(scores_in_cluster), 1), 1)

    return {
        "root_cnic": cnic,
        "cluster_size": len(cluster_members),
        "cluster_members": cluster_members,
        "cluster_edges": cluster_edges[:30],
        "cluster_stats": {
            "avg_compliance_score": avg_score,
            "high_risk_members": high_count,
            "cluster_risk": "HIGH" if high_count >= 2 or avg_score >= 60 else "MEDIUM" if avg_score >= 35 else "LOW",
        },
    }


# ─────────────────────────────────────────────
# USER INPUT ENDPOINTS
# ─────────────────────────────────────────────

def _rebuild_indexes():
    """Rebuild all in-memory indexes after data changes."""
    global ENTITY_MATCHES, SCORES
    VEH_IDX.clear(); BILL_IDX.clear(); RET_IDX.clear(); PROP_IDX.clear(); TRAV_IDX.clear()
    for r in DATA["vehicles"]:      VEH_IDX[r["cnic"]].append(r)
    for r in DATA["utility_bills"]: BILL_IDX[r["cnic"]].append(r)
    for r in DATA["tax_returns"]:   RET_IDX[r["cnic"]].append(r)
    for r in DATA["properties"]:    PROP_IDX[r["cnic"]].append(r)
    for r in DATA["travel_logs"]:   TRAV_IDX[r["cnic"]].append(r)
    ENTITY_MATCHES = resolve_entities()
    SCORES = {c: score_person(c) for c in BY_CNIC}


@app.post("/api/submit", status_code=201)
def submit_person(submission: FullPersonSubmission):
    """Submit a new person with their full profile. System auto-calculates risk score."""
    import json as _json
    cnic = submission.person.cnic

    if cnic in BY_CNIC:
        raise HTTPException(status_code=409, detail=f"Person with CNIC {cnic} already exists. Use /api/persons/{cnic}/update to modify.")

    # Add person
    person_dict = submission.person.dict()
    person_dict["profile_type"] = "user_submitted"
    BY_CNIC[cnic] = person_dict
    DATA["persons"].append(person_dict)

    conn = _get_db()
    try:
        conn.execute(
            "INSERT INTO submitted_persons (cnic,name,address,city,dob,phone,profile_type) VALUES (?,?,?,?,?,?,?)",
            (person_dict["cnic"], person_dict["name"], person_dict["address"],
             person_dict["city"], person_dict["dob"], person_dict["phone"], "user_submitted")
        )

        for v in submission.vehicles:
            vd = v.dict(); vd["cnic"] = cnic
            DATA["vehicles"].append(vd)
            conn.execute(
                "INSERT INTO submitted_vehicles (cnic,registration_no,make,model,year,engine_cc,value_pkr) VALUES (?,?,?,?,?,?,?)",
                (cnic, vd["registration_no"], vd["make"], vd["model"], vd["year"], vd["engine_cc"], vd["value_pkr"])
            )

        for b in submission.utility_bills:
            bd = b.dict(); bd["cnic"] = cnic; bd["address"] = person_dict["address"]
            DATA["utility_bills"].append(bd)
            conn.execute(
                "INSERT INTO submitted_utility_bills (cnic,account_no,monthly_avg_pkr,address,utility_type) VALUES (?,?,?,?,?)",
                (cnic, bd["account_no"], bd["monthly_avg_pkr"], bd["address"], bd["utility_type"])
            )

        for r in submission.tax_returns:
            rd = r.dict(); rd["cnic"] = cnic
            DATA["tax_returns"].append(rd)
            conn.execute(
                "INSERT INTO submitted_tax_returns (cnic,year,declared_income,tax_paid,filing_status) VALUES (?,?,?,?,?)",
                (cnic, rd["year"], rd["declared_income"], rd["tax_paid"], rd["filing_status"])
            )

        for p in submission.properties:
            pd = p.dict(); pd["cnic"] = cnic
            DATA["properties"].append(pd)
            conn.execute(
                "INSERT INTO submitted_properties (cnic,deed_no,address,area_sqft,value_pkr,transaction_type) VALUES (?,?,?,?,?,?)",
                (cnic, pd["deed_no"], pd["address"], pd["area_sqft"], pd["value_pkr"], pd["transaction_type"])
            )

        for t in submission.travel_logs:
            td = t.dict(); td["cnic"] = cnic
            DATA["travel_logs"].append(td)
            conn.execute(
                "INSERT INTO submitted_travel_logs (cnic,passport_no,trips_per_year,destinations,business_class) VALUES (?,?,?,?,?)",
                (cnic, td["passport_no"], td["trips_per_year"],
                 _json.dumps(td["destinations"]), int(td["business_class"]))
            )

        conn.commit()
    finally:
        conn.close()

    _rebuild_indexes()
    score = SCORES.get(cnic, {})

    return {
        "message": "Person submitted successfully",
        "cnic": cnic,
        "name": person_dict["name"],
        "compliance_score": score.get("compliance_score", 0),
        "risk_level": score.get("risk_level", "LOW"),
        "findings_count": len(score.get("findings", [])),
        "score": score,
    }


# ─────────────────────────────────────────────
# AUTH ENDPOINTS
# ─────────────────────────────────────────────

@app.post("/api/auth/register", status_code=201)
def register(body: UserRegister):
    conn = _get_db()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (body.email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Yeh email pehle se registered hai.")
        pw_hash = _hash_password(body.password)
        conn.execute("INSERT INTO users (name, email, pw_hash) VALUES (?, ?, ?)",
                     (body.name, body.email, pw_hash))
        conn.commit()
        row = conn.execute("SELECT id, name, email FROM users WHERE email = ?", (body.email,)).fetchone()
        return {"id": row["id"], "name": row["name"], "email": row["email"]}
    finally:
        conn.close()


@app.post("/api/auth/login")
def login(body: UserLogin):
    conn = _get_db()
    try:
        row = conn.execute("SELECT id, name, email, pw_hash FROM users WHERE email = ?", (body.email,)).fetchone()
        if not row or not _verify_password(body.password, row["pw_hash"]):
            raise HTTPException(status_code=401, detail="Email ya password galat hai.")
        return {"id": row["id"], "name": row["name"], "email": row["email"]}
    finally:
        conn.close()


@app.delete("/api/persons/{cnic}", status_code=200)
def delete_person(cnic: str):
    """Delete a user-submitted person and all their associated data."""
    person = BY_CNIC.get(cnic)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    if person.get("profile_type") != "user_submitted":
        raise HTTPException(status_code=403, detail="Only user-submitted persons can be deleted")

    DATA["persons"] = [p for p in DATA["persons"] if p["cnic"] != cnic]
    DATA["vehicles"] = [v for v in DATA["vehicles"] if v["cnic"] != cnic]
    DATA["utility_bills"] = [b for b in DATA["utility_bills"] if b["cnic"] != cnic]
    DATA["tax_returns"] = [r for r in DATA["tax_returns"] if r["cnic"] != cnic]
    DATA["properties"] = [p for p in DATA["properties"] if p["cnic"] != cnic]
    DATA["travel_logs"] = [t for t in DATA["travel_logs"] if t["cnic"] != cnic]
    del BY_CNIC[cnic]
    if cnic in SCORES:
        del SCORES[cnic]

    conn = _get_db()
    try:
        for tbl in ("submitted_persons","submitted_vehicles","submitted_utility_bills",
                    "submitted_tax_returns","submitted_properties","submitted_travel_logs"):
            conn.execute(f"DELETE FROM {tbl} WHERE cnic = ?", (cnic,))
        conn.commit()
    finally:
        conn.close()

    _rebuild_indexes()
    return {"message": f"Person {cnic} and all associated data deleted successfully"}


@app.get("/api/submit/schema")
def get_submit_schema():
    """Returns example JSON for the /api/submit endpoint so frontend can show a guide."""
    return {
        "example": {
            "person": {
                "cnic": "35201-1234567-8",
                "name": "Muhammad Ali",
                "address": "House 5, Street 3, DHA Phase 5, Lahore",
                "city": "Lahore",
                "dob": "1985-06-15",
                "phone": "0300-1234567"
            },
            "vehicles": [
                {"registration_no": "LHR-123-4567", "make": "Toyota", "model": "Corolla",
                 "year": 2022, "engine_cc": 1800, "value_pkr": 6500000}
            ],
            "utility_bills": [
                {"account_no": "WAPDA-1234567", "monthly_avg_pkr": 25000, "utility_type": "Electricity"}
            ],
            "tax_returns": [
                {"year": 2024, "declared_income": 1200000, "tax_paid": 60000, "filing_status": "filed"}
            ],
            "properties": [
                {"deed_no": "DED-1234567", "address": "Plot 10, DHA Phase 5, Lahore",
                 "area_sqft": 4000, "value_pkr": 12000000, "transaction_type": "purchase"}
            ],
            "travel_logs": [
                {"passport_no": "AB1234567", "trips_per_year": 3,
                 "destinations": ["Dubai", "London"], "business_class": False}
            ]
        },
        "cities": CITIES,
        "filing_statuses": ["filed", "non_filer", "zero_return"],
        "transaction_types": ["purchase", "inherited", "gift"],
        "utility_types": ["Electricity", "Gas"]
    }
