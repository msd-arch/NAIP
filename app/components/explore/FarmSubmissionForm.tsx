"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { CROPS, Crop } from "../../explore/layers";
import type { RegisteredFarm } from "./FarmRegistryMap";

const FarmRegistryMap = dynamic(() => import("./FarmRegistryMap"), { ssr: false });

const API_BASE = "http://localhost:8420";

interface Summary {
  n_real_farms_total: number;
  n_real_farms_with_identity: number;
  n_real_farms_pending: number;
  n_synthetic_farms_total_for_context_only: number;
}
interface SuccessResult {
  masked_cnic: string;
  farm_id: string;
  farmer_id: string;
  district: string;
}
interface LookupResult {
  found: boolean;
  masked_cnic?: string;
  n_real_farms?: number;
  districts?: string[];
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-soft bg-elev-2 p-2.5 text-center">
      <div className="tnum text-base font-semibold text-main">{value}</div>
      <div className="text-[10px] text-faint">{label}</div>
    </div>
  );
}

/** Real 5-7-1 CNIC format, same guidance as the Excel template. Client-side
    check for fast feedback -- the local server independently re-validates
    every field, since a server never trusts client-side checks alone. */
const CNIC_RE = /^\d{5}-\d{7}-\d$/;
const PHONE_RE = /^(\+92|0)3\d{9}$/;

function formatCnicInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 13);
  const p1 = digits.slice(0, 5), p2 = digits.slice(5, 12), p3 = digits.slice(12, 13);
  return [p1, p2, p3].filter(Boolean).join("-");
}

function RegistrationForm({ onRegistered }: { onRegistered: () => void }) {
  const [farmerName, setFarmerName] = useState("");
  const [cnic, setCnic] = useState("");
  const [phone, setPhone] = useState("");
  const [crop, setCrop] = useState<Crop>("wheat");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [areaHa, setAreaHa] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SuccessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientError = (): string | null => {
    if (!farmerName.trim()) return "Farmer name is required.";
    if (!CNIC_RE.test(cnic)) return "CNIC must match the real 5-7-1 format, e.g. 12345-1234567-1.";
    if (!PHONE_RE.test(phone)) return "Phone number must be a real Pakistani mobile number, e.g. 03001234567.";
    const latN = Number(lat), lonN = Number(lon), areaN = Number(areaHa);
    if (!Number.isFinite(latN) || !Number.isFinite(lonN)) return "Farm location (lat/lon) is required.";
    if (!Number.isFinite(areaN) || areaN <= 0) return "Approximate farm area (hectares) is required.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    const clientErr = clientError();
    if (clientErr) {
      setError(clientErr);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmer_name: farmerName, cnic, phone_number: phone,
          crop_type_declared: crop, lat, lon, area_ha: areaHa,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        setFarmerName(""); setCnic(""); setPhone(""); setLat(""); setLon(""); setAreaHa("");
        onRegistered();
      } else {
        setError(data.error || "Submission failed for an unknown real reason.");
      }
    } catch {
      setError("Local Farm Registry server not reachable (localhost:8420) — start it with `python submission_server.py`, then try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude.toFixed(6));
      setLon(pos.coords.longitude.toFixed(6));
    });
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-soft bg-elev p-4">
        <h3 className="text-sm font-semibold text-main">Register a real farm</h3>

        <label className="block text-xs">
          <span className="text-dim">Farmer name</span>
          <input
            className="mt-1 w-full rounded-lg border border-app bg-elev-2 px-2.5 py-1.5 text-xs text-main"
            value={farmerName} onChange={(e) => setFarmerName(e.target.value)} placeholder="Full name"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs">
            <span className="text-dim">CNIC (5-7-1 format)</span>
            <input
              className="mt-1 w-full rounded-lg border border-app bg-elev-2 px-2.5 py-1.5 text-xs text-main tnum"
              value={cnic} onChange={(e) => setCnic(formatCnicInput(e.target.value))} placeholder="12345-1234567-1"
            />
          </label>
          <label className="block text-xs">
            <span className="text-dim">Phone number</span>
            <input
              className="mt-1 w-full rounded-lg border border-app bg-elev-2 px-2.5 py-1.5 text-xs text-main tnum"
              value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03001234567"
            />
          </label>
        </div>

        <label className="block text-xs">
          <span className="text-dim">Declared crop</span>
          <select
            className="mt-1 w-full rounded-lg border border-app bg-elev-2 px-2.5 py-1.5 text-xs text-main capitalize"
            value={crop} onChange={(e) => setCrop(e.target.value as Crop)}
          >
            {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-dim">Farm location</span>
            <button type="button" onClick={useMyLocation} className="text-[10px] text-accent-500 underline underline-offset-2">
              use my current location
            </button>
          </div>
          <p className="mt-1 text-[10px] text-faint">
            An approximate square footprint is generated around this point, sized to your declared
            area — not a drawn true boundary.
          </p>
          <div className="mt-1 grid grid-cols-3 gap-2">
            <input
              className="rounded-lg border border-app bg-elev-2 px-2.5 py-1.5 text-xs text-main tnum"
              value={lat} onChange={(e) => setLat(e.target.value)} placeholder="lat, e.g. 31.55"
            />
            <input
              className="rounded-lg border border-app bg-elev-2 px-2.5 py-1.5 text-xs text-main tnum"
              value={lon} onChange={(e) => setLon(e.target.value)} placeholder="lon, e.g. 74.35"
            />
            <input
              className="rounded-lg border border-app bg-elev-2 px-2.5 py-1.5 text-xs text-main tnum"
              value={areaHa} onChange={(e) => setAreaHa(e.target.value)} placeholder="area, ha"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-critical/40 bg-critical/10 p-2.5 text-xs text-critical">{error}</div>
        )}

        <button
          type="submit" disabled={submitting}
          className="w-full rounded-lg bg-accent-500 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit real farm data"}
        </button>
      </form>

      {result && (
        <div className="rounded-xl border border-accent-500/40 bg-accent-soft p-4 text-xs">
          <h3 className="text-sm font-semibold text-accent-500">Submission recorded</h3>
          <p className="mt-1 text-dim">
            Real record written for district <span className="font-medium text-main">{result.district}</span>.
          </p>
          <p className="mt-2 text-[11px] text-faint">
            CNIC on file: <span className="tnum text-dim">{result.masked_cnic}</span> (masked — never shown
            in full here or anywhere else in this product)
          </p>
          <p className="mt-1 text-[11px] text-faint tnum">farm_id: {result.farm_id}</p>
          <p className="text-[11px] text-faint tnum">farmer_id: {result.farmer_id}</p>
        </div>
      )}
    </div>
  );
}

/** A farmer looking up their OWN registration by CNIC or phone -- not a
    farm-ID lookup (real farm_id UUIDs aren't something a farmer would ever
    know or type). Returns a real, minimal, masked summary only -- see
    lookup_farmer()'s own docstring for why this stays consistent with the
    page's write-only display design even on the read side. */
function FindMyRegistration() {
  const [mode, setMode] = useState<"cnic" | "phone">("cnic");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    setError(null);
    setResult(null);
    const q = mode === "cnic" ? `cnic=${encodeURIComponent(value)}` : `phone=${encodeURIComponent(value)}`;
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/api/lookup?${q}`);
      const data = await res.json();
      if (data.success) setResult(data);
      else setError(data.error || "Lookup failed for an unknown real reason.");
    } catch {
      setError("Local Farm Registry server not reachable (localhost:8420).");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="rounded-xl border border-soft bg-elev p-4">
      <h3 className="text-sm font-semibold text-main">Find my registration</h3>
      <p className="mt-1 text-[11px] text-faint">
        Look up by your own CNIC or phone number — never by an internal farm ID.
      </p>
      <div className="mt-2 flex gap-2 text-[11px]">
        <button
          onClick={() => { setMode("cnic"); setValue(""); setResult(null); }}
          className={`rounded-full border px-2.5 py-1 ${mode === "cnic" ? "border-accent-500 bg-accent-soft text-accent-500 font-semibold" : "border-soft text-dim"}`}
        >
          By CNIC
        </button>
        <button
          onClick={() => { setMode("phone"); setValue(""); setResult(null); }}
          className={`rounded-full border px-2.5 py-1 ${mode === "phone" ? "border-accent-500 bg-accent-soft text-accent-500 font-semibold" : "border-soft text-dim"}`}
        >
          By phone
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-app bg-elev-2 px-2.5 py-1.5 text-xs text-main tnum"
          value={value}
          onChange={(e) => setValue(mode === "cnic" ? formatCnicInput(e.target.value) : e.target.value)}
          placeholder={mode === "cnic" ? "12345-1234567-1" : "03001234567"}
        />
        <button
          onClick={search} disabled={searching || !value}
          className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {searching ? "…" : "Search"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-critical">{error}</p>}
      {result && (
        result.found ? (
          <div className="mt-3 rounded-lg bg-elev-2 p-2.5 text-xs">
            <p className="text-dim">
              Found — CNIC on file <span className="tnum text-main">{result.masked_cnic}</span>
            </p>
            <p className="mt-1 text-dim">
              {result.n_real_farms} real farm{result.n_real_farms === 1 ? "" : "s"} registered:{" "}
              <span className="text-main">{result.districts?.join(", ")}</span>
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-faint">No real registration found for that {mode === "cnic" ? "CNIC" : "phone number"}.</p>
        )
      )}
    </div>
  );
}

/** Real Farm Data submission page: writes a real farmer identity + a new
    farm record through register_farmer_submission() (db_registry.py), the
    already-built, already-live Postgres write path -- via a local-only
    HTTP bridge (submission_server.py), never a browser-side DB credential
    (see that script's own docstring for why: this dashboard is a fully
    static export, and a static bundle's JS is public forever).

    Write-only by design, confirmed before building: the raw CNIC/phone
    submitted here is never rendered back to this screen or any other --
    success shows a masked reference (last CNIC digit, real farm_id/
    farmer_id UUIDs) only. Layout: the registration form renders first and
    full-height, immediately visible without scrolling -- the coverage
    summary, real farm map, and lookup panel sit alongside it, not above it. */
export default function FarmSubmissionForm() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [farms, setFarms] = useState<RegisteredFarm[]>([]);

  const fetchSummary = useCallback(() => {
    fetch(`${API_BASE}/api/summary`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSummary(d);
          setSummaryError(null);
        } else {
          setSummaryError(d.error || "real error loading summary");
        }
      })
      .catch(() => setSummaryError("Local Farm Registry server not reachable (localhost:8420) — start it with `python submission_server.py`."));
    fetch(`${API_BASE}/api/farms`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setFarms(d.farms); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-secondary-500/40 bg-secondary-soft p-3 text-[11px] leading-relaxed text-dim">
        <span className="font-medium">Dev-only feature — </span>
        real submissions only work while the local Farm Registry server is running
        (<code>python submission_server.py</code>) alongside <code>npm run dev</code>. It cannot
        reach the live database from the public GitHub Pages deployment — that credential is
        deliberately never shipped to the browser bundle.
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
        <RegistrationForm onRegistered={fetchSummary} />

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-main">Real Farm Registry coverage</h3>
            {summary ? (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile label="real farms with identity" value={String(summary.n_real_farms_with_identity)} />
                <StatTile label="real farms pending" value={String(summary.n_real_farms_pending)} />
                <StatTile label="real farms total" value={String(summary.n_real_farms_total)} />
                <StatTile label="synthetic (context only, never blended)" value={String(summary.n_synthetic_farms_total_for_context_only)} />
              </div>
            ) : (
              <p className="mt-2 text-xs text-faint">{summaryError ?? "Loading…"}</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-main">Registered farms</h3>
            <p className="mt-0.5 text-[10px] text-faint">
              Every real, identity-linked farm ({farms.length} shown) — never a synthetic farm, never a raw
              identity field.
            </p>
            <div className="mt-2 h-[320px]">
              <FarmRegistryMap farms={farms} />
            </div>
          </div>

          <FindMyRegistration />
        </div>
      </div>
    </div>
  );
}
