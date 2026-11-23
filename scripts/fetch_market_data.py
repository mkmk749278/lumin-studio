#!/usr/bin/env python3
"""Geo-block-safe Binance USD-M perpetual futures market-data fetcher.

Why this shape (CLAUDE.md §4): cloud sessions and Modal containers usually run on US IPs, where
``fapi.binance.com`` answers HTTP 451. The official archive at ``data.binance.vision`` is not geo-blocked,
so it is the PRIMARY source for anything older than today. Only the current (unpublished) UTC day falls back
to live REST, and that chain is fapi -> Bybit linear -> OKX swap, each tried once, each logged.

Output: normalised JSON ``{"meta": {...}, "candles": [{timestamp, open, high, low, close, volume}, ...]}``
written to ``data/market/``. Remotion reads ONLY these files; nothing fetches at render time.

Stdlib only, so it runs unchanged on a phone-driven session, a Modal container or a VPS.

Examples:
    python3 scripts/fetch_market_data.py klines --symbol BTCUSDT --interval 15m --hours 48 \
        --out data/market/sample_btcusdt_15m.json
    python3 scripts/fetch_market_data.py klines --symbol SOLUSDT --interval 5m \
        --start 2026-10-01 --end 2026-10-03 --episode ep01
    python3 scripts/fetch_market_data.py funding --symbol BTCUSDT --month 2026-10 --episode ep02
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import json
import sys
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

VISION = "https://data.binance.vision/data/futures/um"
UA = "lumin-studio-fetcher/1.0"
INTERVAL_MS = {
    "1m": 60_000, "3m": 180_000, "5m": 300_000, "15m": 900_000, "30m": 1_800_000,
    "1h": 3_600_000, "2h": 7_200_000, "4h": 14_400_000, "6h": 21_600_000, "8h": 28_800_000,
    "12h": 43_200_000, "1d": 86_400_000,
}
BYBIT_INTERVAL = {"1m": "1", "3m": "3", "5m": "5", "15m": "15", "30m": "30", "1h": "60", "2h": "120",
                  "4h": "240", "6h": "360", "12h": "720", "1d": "D"}
OKX_INTERVAL = {"1m": "1m", "3m": "3m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1H", "2h": "2H",
                "4h": "4H", "6h": "6H", "12h": "12H", "1d": "1D"}
REPO = Path(__file__).resolve().parent.parent


def log(msg: str) -> None:
    print(f"[fetch] {msg}", flush=True)


class GeoBlocked(Exception):
    pass


def http_get(url: str, timeout: float = 30.0, retries: int = 3) -> bytes | None:
    """GET with backoff. Returns None on 404 (archive day not published). Raises GeoBlocked on 451/403."""
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code in (451, 403):
                raise GeoBlocked(f"HTTP {e.code} from {url.split('?')[0]}") from e
            if attempt == retries:
                raise
            log(f"HTTP {e.code}, retry {attempt}/{retries}")
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt == retries:
                raise
            log(f"network error ({e}), retry {attempt}/{retries}")
        time.sleep(2 ** attempt)
    return None


# ---------------------------------------------------------------- archive (primary) -----------------------

def _parse_kline_csv(raw: bytes) -> list[dict]:
    """Archive CSVs carry a header row since 2022; older ones do not. Both are handled."""
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        text = zf.read(zf.namelist()[0]).decode()
    out = []
    for row in csv.reader(io.StringIO(text)):
        if not row or not row[0].strip().lstrip("-").isdigit():
            continue  # header
        out.append({
            "timestamp": int(row[0]), "open": float(row[1]), "high": float(row[2]),
            "low": float(row[3]), "close": float(row[4]), "volume": float(row[5]),
        })
    return out


def archive_day(symbol: str, interval: str, day: dt.date) -> list[dict] | None:
    url = f"{VISION}/daily/klines/{symbol}/{interval}/{symbol}-{interval}-{day.isoformat()}.zip"
    raw = http_get(url)
    return None if raw is None else _parse_kline_csv(raw)


def archive_month(symbol: str, interval: str, year: int, month: int) -> list[dict] | None:
    url = f"{VISION}/monthly/klines/{symbol}/{interval}/{symbol}-{interval}-{year:04d}-{month:02d}.zip"
    raw = http_get(url)
    return None if raw is None else _parse_kline_csv(raw)


# ---------------------------------------------------------------- live fallback (today only) --------------

def live_binance(symbol: str, interval: str, start_ms: int, end_ms: int) -> list[dict]:
    out: list[dict] = []
    cur = start_ms
    while cur < end_ms:
        url = (f"https://fapi.binance.com/fapi/v1/klines?symbol={symbol}&interval={interval}"
               f"&startTime={cur}&endTime={end_ms - 1}&limit=1500")
        rows = json.loads(http_get(url) or b"[]")
        if not rows:
            break
        out += [{"timestamp": int(r[0]), "open": float(r[1]), "high": float(r[2]), "low": float(r[3]),
                 "close": float(r[4]), "volume": float(r[5])} for r in rows]
        cur = int(rows[-1][0]) + INTERVAL_MS[interval]
    return out


def live_bybit(symbol: str, interval: str, start_ms: int, end_ms: int) -> list[dict]:
    out: list[dict] = []
    cur_end = end_ms - 1
    while cur_end >= start_ms:
        url = (f"https://api.bybit.com/v5/market/kline?category=linear&symbol={symbol}"
               f"&interval={BYBIT_INTERVAL[interval]}&start={start_ms}&end={cur_end}&limit=1000")
        body = json.loads(http_get(url) or b"{}")
        if body.get("retCode") != 0:
            raise RuntimeError(f"bybit retCode {body.get('retCode')}: {body.get('retMsg')}")
        rows = body["result"]["list"]  # newest first
        if not rows:
            break
        out += [{"timestamp": int(r[0]), "open": float(r[1]), "high": float(r[2]), "low": float(r[3]),
                 "close": float(r[4]), "volume": float(r[5])} for r in rows]
        cur_end = int(rows[-1][0]) - 1
    return out


def live_okx(symbol: str, interval: str, start_ms: int, end_ms: int) -> list[dict]:
    if not symbol.endswith("USDT"):
        raise RuntimeError(f"cannot map {symbol} to an OKX swap id")
    inst = f"{symbol[:-4]}-USDT-SWAP"
    out: list[dict] = []
    after = end_ms
    while after > start_ms:
        url = (f"https://www.okx.com/api/v5/market/history-candles?instId={inst}"
               f"&bar={OKX_INTERVAL[interval]}&after={after}&limit=100")
        body = json.loads(http_get(url) or b"{}")
        rows = body.get("data") or []
        if not rows:
            break
        # OKX volume[5] is in contracts; [7] volCcyQuote is quote volume. Keep base-asset volume ([6]).
        out += [{"timestamp": int(r[0]), "open": float(r[1]), "high": float(r[2]), "low": float(r[3]),
                 "close": float(r[4]), "volume": float(r[6])} for r in rows]
        after = int(rows[-1][0])
    return out


def live_chain(symbol: str, interval: str, start_ms: int, end_ms: int) -> tuple[list[dict], str]:
    for name, fn in (("fapi.binance.com", live_binance), ("api.bybit.com", live_bybit),
                     ("www.okx.com", live_okx)):
        try:
            rows = fn(symbol, interval, start_ms, end_ms)
            if not rows:
                raise RuntimeError("empty response")
            log(f"live fallback: {name} returned {len(rows)} candles")
            return rows, name
        except GeoBlocked as e:
            log(f"live fallback: {name} geo-blocked ({e}); trying next venue")
        except Exception as e:  # noqa: BLE001 - one venue failing must not stop the chain
            log(f"live fallback: {name} failed ({type(e).__name__}: {e}); trying next venue")
    raise RuntimeError("every live venue failed for the current UTC day")


# ---------------------------------------------------------------- orchestration ---------------------------

def fetch_klines(symbol: str, interval: str, start: dt.datetime, end: dt.datetime) -> tuple[list[dict], dict]:
    if interval not in INTERVAL_MS:
        raise SystemExit(f"unsupported interval {interval}")
    start_ms = int(start.timestamp() * 1000)
    end_ms = int(end.timestamp() * 1000)
    today = dt.datetime.now(dt.timezone.utc).date()
    rows: list[dict] = []

    day = start.date()
    last_day = (end - dt.timedelta(milliseconds=1)).date()  # end is exclusive
    while day <= last_day:
        # Whole past months go through one monthly zip (fewer requests) when the range covers them.
        first = day.replace(day=1)
        nxt = (first + dt.timedelta(days=32)).replace(day=1)
        last = nxt - dt.timedelta(days=1)
        if day == first and last <= last_day and last < today - dt.timedelta(days=1):
            got = archive_month(symbol, interval, first.year, first.month)
            if got is not None:
                log(f"archive monthly {first:%Y-%m}: {len(got)} candles")
                rows += [{**r, "_src": "data.binance.vision/monthly"} for r in got]
                day = nxt.date() if isinstance(nxt, dt.datetime) else nxt
                continue
        got = archive_day(symbol, interval, day) if day < today else None
        if got is not None:
            log(f"archive daily {day}: {len(got)} candles")
            rows += [{**r, "_src": "data.binance.vision/daily"} for r in got]
        else:
            # Not yet published (today, or occasionally yesterday before ~08:00 UTC): live chain.
            d0 = int(dt.datetime.combine(day, dt.time(), dt.timezone.utc).timestamp() * 1000)
            d1 = d0 + 86_400_000
            log(f"archive has no {day}; using live fallback")
            live, venue = live_chain(symbol, interval, max(d0, start_ms), min(d1, end_ms))
            rows += [{**r, "_src": venue} for r in live]
        day += dt.timedelta(days=1)

    # Window, de-duplicate, sort, and drop the still-forming bar (determinism: a render never changes).
    now_ms = int(time.time() * 1000)
    step = INTERVAL_MS[interval]
    seen: dict[int, dict] = {}
    for r in rows:
        if start_ms <= r["timestamp"] < end_ms and r["timestamp"] + step <= now_ms:
            seen[r["timestamp"]] = r
    candles = [seen[k] for k in sorted(seen)]
    # Count sources AFTER windowing, so meta says exactly where every rendered candle came from.
    sources: dict[str, int] = {}
    for c in candles:
        src = c.pop("_src")
        sources[src] = sources.get(src, 0) + 1
    if any(not s.startswith("data.binance.vision") and s != "fapi.binance.com" for s in sources):
        log("NOTE: part of this series is a non-Binance venue (fallback); meta.sources says which bars")
    gaps = [candles[i]["timestamp"] for i in range(1, len(candles))
            if candles[i]["timestamp"] - candles[i - 1]["timestamp"] != step]
    meta = {
        "symbol": symbol, "interval": interval, "market": "binance_usdm_perpetual",
        "start": start.isoformat(), "end": end.isoformat(), "count": len(candles),
        "expected": (end_ms - start_ms) // step, "gaps_at": gaps, "sources": sources,
        "fetched_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
    }
    return candles, meta


def fetch_funding(symbol: str, month: str) -> tuple[list[dict], dict]:
    y, m = (int(x) for x in month.split("-"))
    url = f"{VISION}/monthly/fundingRate/{symbol}/{symbol}-fundingRate-{y:04d}-{m:02d}.zip"
    raw = http_get(url)
    if raw is None:
        raise SystemExit(f"no funding archive for {symbol} {month} (not yet published?)")
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        text = zf.read(zf.namelist()[0]).decode()
    rows = []
    for row in csv.reader(io.StringIO(text)):
        if not row or not row[0].strip().isdigit():
            continue
        rows.append({"timestamp": int(row[0]), "interval_hours": int(row[1]), "rate": float(row[2])})
    meta = {"symbol": symbol, "month": month, "count": len(rows), "source": "data.binance.vision/monthly",
            "fetched_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")}
    return rows, meta


def _parse_when(s: str) -> dt.datetime:
    d = dt.datetime.fromisoformat(s)
    return d if d.tzinfo else d.replace(tzinfo=dt.timezone.utc)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    k = sub.add_parser("klines")
    k.add_argument("--symbol", required=True)
    k.add_argument("--interval", default="15m")
    k.add_argument("--hours", type=float, help="window ending at the last CLOSED bar (default 48)")
    k.add_argument("--start", help="UTC ISO date/datetime")
    k.add_argument("--end", help="UTC ISO date/datetime (exclusive)")
    k.add_argument("--episode", default="adhoc")
    k.add_argument("--out")
    f = sub.add_parser("funding")
    f.add_argument("--symbol", required=True)
    f.add_argument("--month", required=True, help="YYYY-MM")
    f.add_argument("--episode", default="adhoc")
    f.add_argument("--out")
    a = ap.parse_args()

    if a.cmd == "klines":
        sym = a.symbol.upper()
        if a.start:
            start = _parse_when(a.start)
            end = _parse_when(a.end) if a.end else dt.datetime.now(dt.timezone.utc)
        else:
            step_s = INTERVAL_MS[a.interval] / 1000
            now = dt.datetime.now(dt.timezone.utc).timestamp()
            end = dt.datetime.fromtimestamp((now // step_s) * step_s, dt.timezone.utc)
            start = end - dt.timedelta(hours=a.hours or 48)
        log(f"{sym} {a.interval} {start.isoformat()} -> {end.isoformat()}")
        data, meta = fetch_klines(sym, a.interval, start, end)
        out = Path(a.out) if a.out else REPO / "data" / "market" / f"{a.episode}_{sym.lower()}_{a.interval}.json"
    else:
        sym = a.symbol.upper()
        data, meta = fetch_funding(sym, a.month)
        out = Path(a.out) if a.out else REPO / "data" / "market" / f"{a.episode}_{sym.lower()}_funding_{a.month}.json"

    if not data:
        log("FAILED: zero rows")
        return 1
    out.parent.mkdir(parents=True, exist_ok=True)
    key = "candles" if a.cmd == "klines" else "funding"
    out.write_text(json.dumps({"meta": meta, key: data}, separators=(",", ":")) + "\n")
    log(f"wrote {len(data)} rows -> {out} ({out.stat().st_size / 1024:.1f} KiB); meta={json.dumps(meta)[:300]}")
    if a.cmd == "klines" and meta["gaps_at"]:
        log(f"WARNING: {len(meta['gaps_at'])} gap(s) in series")
    return 0


if __name__ == "__main__":
    sys.exit(main())
