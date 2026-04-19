#!/usr/bin/env python3
"""
arxiv_watcher.py — Query arXiv for recent nickelate SC papers and diff against dataset.

Usage:
    python scripts/arxiv_watcher.py                  # default: last 30 days
    python scripts/arxiv_watcher.py --days 90         # custom window
    python scripts/arxiv_watcher.py --dry-run          # print only, don't write JSON

Requires: requests, feedparser
    pip install requests feedparser
"""

import argparse
import io
import json
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Fix Windows console encoding for Unicode subscripts
if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import feedparser
import requests

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DATASET_PATH = Path(__file__).resolve().parent.parent / "src" / "data" / "nickelate_dataset.json"
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "src" / "data" / "arxiv_alerts.json"

SEARCH_QUERIES = [
    'all:"nickelate superconductor"',
    'all:"La3Ni2O7"',
    'all:"nickelate thin film" AND all:"Tc"',
    'all:"Ruddlesden-Popper nickelate"',
]

ARXIV_API = "http://export.arxiv.org/api/query"
MAX_RESULTS_PER_QUERY = 50

# ---------------------------------------------------------------------------
# Abstract extraction — regex + heuristics
# ---------------------------------------------------------------------------

# Material formula patterns
MATERIAL_PATTERNS = [
    (r"\(La[,\s]*Pr\)[₃3]Ni[₂2]O[₇7]", "(La,Pr)₃Ni₂O₇"),
    (r"La[₂2]PrNi[₂2]O[₇7]", "La₂PrNi₂O₇"),
    (r"La[₃3][\-−]?[ₓx]Sr[ₓx]?Ni[₂2]O[₇7]", "La₃₋ₓSrₓNi₂O₇"),
    (r"La[₃3]Ni[₂2]O[₇7]", "La₃Ni₂O₇"),
    (r"Nd[₀0][\.\s]*[₈8]Sr[₀0][\.\s]*[₂2]NiO[₂2]", "Nd₀.₈Sr₀.₂NiO₂"),
]

# Substrate patterns
SUBSTRATE_PATTERNS = [
    (r"SrLaAlO[₄4]|SLAO", "SrLaAlO₄"),
    (r"LaAlO[₃3]|LAO(?!\w)", "LaAlO₃"),
    (r"SrTiO[₃3]|STO(?!\w)", "SrTiO₃"),
    (r"NdGaO[₃3]|NGO(?!\w)", "NdGaO₃"),
    (r"SmAlO[₃3]", "SmAlO₃"),
    (r"EuAlO[₃3]", "EuAlO₃"),
    (r"YAlO[₃3]|YAP", "YAlO₃"),
]

# Tc extraction patterns (captures the number)
TC_PATTERNS = [
    r"[Tt][Cc][\s,]*(?:onset)?[\s~≈≃]*(\d+\.?\d*)\s*K",
    r"onset\s+(?:Tc\s+)?(?:at\s+|of\s+|~\s*|≈\s*)?(\d+\.?\d*)\s*K",
    r"superconducting\s+transition\s+(?:at\s+|near\s+)?(?:~\s*|≈\s*)?(\d+\.?\d*)\s*K",
    r"(\d+\.?\d*)\s*K\s+(?:onset|superconducti)",
    r"[Tt][Cc]\s*=\s*(\d+\.?\d*)\s*K",
]

# Growth method patterns
GROWTH_PATTERNS = [
    (r"\bPLD\b|pulsed\s+laser\s+deposition", "PLD"),
    (r"\bMBE\b|molecular\s+beam\s+epitaxy", "MBE"),
    (r"\bGAE\b|gas[\s-]*assisted\s+evaporation", "GAE"),
]

# Pressure patterns (captures GPa value)
PRESSURE_PATTERNS = [
    r"(\d+\.?\d*)\s*GPa",
    r"under\s+(\d+\.?\d*)\s*GPa",
    r"at\s+(\d+\.?\d*)\s*GPa\s+pressure",
]


def extract_material(text):
    for pattern, name in MATERIAL_PATTERNS:
        if re.search(pattern, text):
            return name
    return None


def extract_substrate(text):
    for pattern, name in SUBSTRATE_PATTERNS:
        if re.search(pattern, text):
            return name
    return None


def extract_tc(text):
    """Extract the onset Tc value from abstract text. Returns float or None."""
    candidates = []
    for pattern in TC_PATTERNS:
        for match in re.finditer(pattern, text):
            val = float(match.group(1))
            if 0 < val < 400:  # sanity range for superconductors
                candidates.append(val)
    if not candidates:
        return None
    # Return the highest Tc mentioned (likely the headline result)
    return max(candidates)


def extract_growth(text):
    for pattern, name in GROWTH_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return name
    return None


def extract_pressure(text):
    """Extract pressure in GPa. Returns float or None (None = ambient)."""
    if re.search(r"ambient\s+pressure", text, re.IGNORECASE):
        return 0
    for pattern in PRESSURE_PATTERNS:
        match = re.search(pattern, text)
        if match:
            return float(match.group(1))
    return None


# ---------------------------------------------------------------------------
# arXiv API query
# ---------------------------------------------------------------------------

def query_arxiv(search_query, max_results=MAX_RESULTS_PER_QUERY):
    """Query arXiv Atom API and return parsed entries."""
    params = {
        "search_query": search_query,
        "start": 0,
        "max_results": max_results,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    }
    resp = requests.get(ARXIV_API, params=params, timeout=30)
    resp.raise_for_status()
    feed = feedparser.parse(resp.text)
    return feed.entries


def fetch_recent_papers(days=30):
    """Fetch recent papers across all search queries, deduplicated by arXiv ID."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    seen_ids = set()
    papers = []

    for query in SEARCH_QUERIES:
        print(f"  querying: {query}")
        try:
            entries = query_arxiv(query)
        except Exception as e:
            print(f"  warning: query failed — {e}")
            continue

        for entry in entries:
            arxiv_id = entry.id.split("/abs/")[-1].split("v")[0]
            if arxiv_id in seen_ids:
                continue
            seen_ids.add(arxiv_id)

            # Parse published date
            published = entry.get("published", "")
            try:
                pub_dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                pub_dt = datetime.now(timezone.utc)

            if pub_dt < cutoff:
                continue

            abstract = entry.get("summary", "")
            title = entry.get("title", "").replace("\n", " ").strip()
            authors = [a.get("name", "") for a in entry.get("authors", [])]

            papers.append({
                "arxiv_id": arxiv_id,
                "title": title,
                "authors": authors[:5],  # cap at 5
                "published": pub_dt.strftime("%Y-%m-%d"),
                "url": f"https://arxiv.org/abs/{arxiv_id}",
                "abstract": abstract,
            })

        # Be polite to arXiv API
        time.sleep(3)

    print(f"  found {len(papers)} unique papers in last {days} days")
    return papers


# ---------------------------------------------------------------------------
# Diff against dataset
# ---------------------------------------------------------------------------

def load_dataset():
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["measurements"]


def diff_paper(extracted, dataset):
    """Compare extracted values against the dataset. Returns (diff_type, detail, affects)."""
    material = extracted.get("material")
    substrate = extracted.get("substrate")
    tc = extracted.get("onset_tc")
    pressure = extracted.get("pressure_gpa")

    if not material or tc is None:
        return "INFO", "Nickelate paper — could not extract Tc from abstract.", []

    # Find matching entries in dataset
    matches = [
        m for m in dataset
        if m["material"] == material
        and (m["substrate"] == substrate or substrate is None)
    ]

    # Check for record
    max_tc = max((m["onset_tc"] for m in dataset), default=0)
    if tc > max_tc:
        return (
            "RECORD",
            f"New record: {tc}K onset on {material}"
            + (f"/{substrate}" if substrate else "")
            + (f" under {pressure} GPa" if pressure and pressure > 0 else " at ambient")
            + f". Previous record was {max_tc}K.",
            ["P1", "P2"],
        )

    if not matches:
        return (
            "NEW",
            f"New material+substrate combo: {material}"
            + (f" on {substrate}" if substrate else "")
            + f" with Tc={tc}K.",
            [],
        )

    # Check if Tc is significantly different from existing
    existing_tcs = [m["onset_tc"] for m in matches if m["onset_tc"] is not None]
    if not existing_tcs:
        return "NEW", f"{material}: Tc={tc}K — no existing Tc data to compare.", []

    closest = min(existing_tcs, key=lambda x: abs(x - tc))
    diff = abs(tc - closest)

    if diff <= 5:
        return (
            "CONFIRMS",
            f"Confirms existing data: {material} Tc={tc}K (dataset has {closest}K, Δ={diff:.0f}K).",
            [],
        )

    # Significant difference
    affected = []
    if tc > closest:
        affected = ["P1"] if pressure and pressure > 0 else ["P2"]
    return (
        "UPDATE",
        f"Different Tc for {material}"
        + (f" on {substrate}" if substrate else "")
        + f": reports {tc}K vs existing {closest}K (Δ={diff:.0f}K)."
        + (f" Under {pressure} GPa." if pressure and pressure > 0 else ""),
        affected,
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="arXiv nickelate SC paper watcher")
    parser.add_argument("--days", type=int, default=30, help="Look back N days (default 30)")
    parser.add_argument("--dry-run", action="store_true", help="Print only, don't write JSON")
    args = parser.parse_args()

    print(f"arXiv watcher — scanning last {args.days} days\n")

    dataset = load_dataset()
    print(f"loaded {len(dataset)} measurements from dataset\n")

    papers = fetch_recent_papers(days=args.days)

    alerts = []
    for paper in papers:
        text = paper["title"] + " " + paper["abstract"]
        extracted = {
            "material": extract_material(text),
            "substrate": extract_substrate(text),
            "onset_tc": extract_tc(text),
            "growth_method": extract_growth(text),
            "pressure_gpa": extract_pressure(text),
        }

        # Skip papers where we couldn't extract anything useful
        if not extracted["material"] and extracted["onset_tc"] is None:
            continue

        diff_type, diff_detail, affects = diff_paper(extracted, dataset)

        alert = {
            "arxiv_id": paper["arxiv_id"],
            "title": paper["title"],
            "authors": paper["authors"],
            "published": paper["published"],
            "url": paper["url"],
            "extracted": extracted,
            "diff_type": diff_type,
            "diff_detail": diff_detail,
            "affects_predictions": affects,
        }
        alerts.append(alert)

    # Sort: RECORD first, then NEW, UPDATE, CONFIRMS, INFO
    type_order = {"RECORD": 0, "NEW": 1, "UPDATE": 2, "CONFIRMS": 3, "INFO": 4}
    alerts.sort(key=lambda a: type_order.get(a["diff_type"], 5))

    # Print summary
    print(f"\n{'=' * 70}")
    print(f"ALERTS — {len(alerts)} papers with extractable data")
    print(f"{'=' * 70}\n")

    type_colors = {
        "RECORD": "\033[33;1m", "NEW": "\033[32m", "UPDATE": "\033[33m",
        "CONFIRMS": "\033[90m", "INFO": "\033[90m",
    }
    reset = "\033[0m"

    for a in alerts:
        color = type_colors.get(a["diff_type"], "")
        print(f"{color}[{a['diff_type']}]{reset} {a['diff_detail']}")
        print(f"  {a['title'][:80]}")
        print(f"  {a['url']}  ({a['published']})")
        if a["affects_predictions"]:
            print(f"  affects: {', '.join(a['affects_predictions'])}")
        print()

    # Write JSON
    if not args.dry_run:
        output = {
            "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "window_days": args.days,
            "alert_count": len(alerts),
            "alerts": alerts,
        }
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        print(f"wrote {len(alerts)} alerts to {OUTPUT_PATH}")
    else:
        print("(dry run — no JSON written)")


if __name__ == "__main__":
    main()
