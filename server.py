#!/usr/bin/env python3
"""Local Linux metrics API and optional SQLite history recorder."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import json
import os
import socket
import sqlite3
import threading
import time

import psutil

# SQLite may create WAL/SHM sidecar files while history is enabled. Keep
# those private from the moment they are created, not just the main database.
os.umask(0o077)

ROOT = Path(__file__).resolve().parent
LOCALES = {"en", "fr", "es", "zh", "ja"}
PORT = int(os.environ.get("ILINUXSTATS_PORT", "8765"))
STATE_DIR = Path(os.environ.get("XDG_STATE_HOME", Path.home() / ".local/state")) / "ilinuxstats"
DB_PATH = STATE_DIR / "history.sqlite3"
DB_LOCK = threading.Lock()
DEFAULT_PANEL_CONFIG = {key: {"mode": "value", "color": "auto"} for key in ("cpu", "memory", "disk", "network", "uptime")}
_last_net = psutil.net_io_counters(pernic=True)
_last_at = time.monotonic()


def db():
    STATE_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    try:
        os.chmod(STATE_DIR, 0o700)
    except OSError:
        pass
    con = sqlite3.connect(DB_PATH, timeout=10)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("CREATE TABLE IF NOT EXISTS samples (ts REAL PRIMARY KEY, cpu REAL, ram REAL, disk REAL, rx REAL, tx REAL)")
    con.execute("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    try:
        os.chmod(DB_PATH, 0o600)
    except OSError:
        pass
    return con


def get_settings():
    with DB_LOCK, db() as con:
        values = dict(con.execute("SELECT key, value FROM settings"))
    return {"recording": values.get("recording", "false") == "true",
            "retention_days": int(values.get("retention_days", "30")),
            "record_interval": int(values.get("record_interval", "60")),
            "panel_widgets": json.loads(values.get("panel_widgets", '["cpu", "memory"]')),
            "panel_config": json.loads(values.get("panel_config", json.dumps(DEFAULT_PANEL_CONFIG)))}


def purge(days):
    with DB_LOCK, db() as con:
        con.execute("DELETE FROM samples WHERE ts < ?", (time.time() - days * 86400,))


def set_settings(incoming):
    current = get_settings()
    if "recording" in incoming:
        current["recording"] = bool(incoming["recording"])
    if "retention_days" in incoming:
        current["retention_days"] = max(1, min(365, int(incoming["retention_days"])))
    if "record_interval" in incoming and int(incoming["record_interval"]) in (10, 30, 60, 300):
        current["record_interval"] = int(incoming["record_interval"])
    if "panel_widgets" in incoming and isinstance(incoming["panel_widgets"], list):
        allowed = {"cpu", "memory", "disk", "network", "uptime"}
        current["panel_widgets"] = [name for name in incoming["panel_widgets"] if name in allowed]
    if "panel_config" in incoming and isinstance(incoming["panel_config"], dict):
        modes, colors = {"value", "compact", "graph"}, {"auto", "green", "cyan", "orange", "white"}
        config = {key: dict(DEFAULT_PANEL_CONFIG[key]) for key in DEFAULT_PANEL_CONFIG}
        for key, options in incoming["panel_config"].items():
            if key in config and isinstance(options, dict):
                if options.get("mode") in modes:
                    config[key]["mode"] = options["mode"]
                if options.get("color") in colors:
                    config[key]["color"] = options["color"]
        current["panel_config"] = config
    with DB_LOCK, db() as con:
        con.executemany("INSERT OR REPLACE INTO settings(key,value) VALUES (?,?)", [
            ("recording", str(current["recording"]).lower()),
            ("retention_days", str(current["retention_days"])),
            ("record_interval", str(current["record_interval"])),
            ("panel_widgets", json.dumps(current["panel_widgets"])),
            ("panel_config", json.dumps(current["panel_config"]))])
    purge(current["retention_days"])
    return current


def metrics():
    global _last_net, _last_at
    now = time.monotonic()
    elapsed = max(now - _last_at, 0.01)
    net_now = psutil.net_io_counters(pernic=True)
    interface_stats = psutil.net_if_stats()
    interfaces = []
    for name, counters in net_now.items():
        old = _last_net.get(name)
        interfaces.append({"name": name, "up": bool(interface_stats.get(name) and interface_stats[name].isup),
                           "sent": counters.bytes_sent, "recv": counters.bytes_recv,
                           "upload": max(0, counters.bytes_sent - old.bytes_sent) / elapsed if old else 0,
                           "download": max(0, counters.bytes_recv - old.bytes_recv) / elapsed if old else 0})
    _last_net, _last_at = net_now, now
    disks, seen = [], set()
    for part in psutil.disk_partitions(all=False):
        if part.mountpoint in seen:
            continue
        seen.add(part.mountpoint)
        try:
            usage = psutil.disk_usage(part.mountpoint)
            disks.append({"device": part.device, "mount": part.mountpoint, "used": usage.used,
                          "total": usage.total, "percent": usage.percent})
        except (PermissionError, OSError):
            pass
    mem, swap = psutil.virtual_memory(), psutil.swap_memory()
    temps = {}
    try:
        for chip, readings in (psutil.sensors_temperatures() or {}).items():
            for reading in readings:
                if reading.current:
                    temps.setdefault(chip, []).append({"label": reading.label or chip, "c": reading.current})
    except (AttributeError, OSError):
        pass
    freq = psutil.cpu_freq()
    return {"host": socket.gethostname(), "time": time.time(),
            "cpu": {"percent": psutil.cpu_percent(interval=None), "cores": psutil.cpu_percent(interval=None, percpu=True),
                    "count": psutil.cpu_count(logical=True) or 1, "freq": freq.current if freq else None,
                    "load": list(os.getloadavg()) if hasattr(os, "getloadavg") else [], "temps": temps},
            "memory": {"total": mem.total, "used": mem.used, "available": mem.available, "percent": mem.percent,
                       "swap_total": swap.total, "swap_used": swap.used, "swap_percent": swap.percent},
            "disks": disks, "network": interfaces,
            "system": {"uptime": time.time() - psutil.boot_time(), "processes": len(psutil.pids())}}


def save_sample(data):
    disk = next((d for d in data["disks"] if d["mount"] == "/"), data["disks"][0] if data["disks"] else {})
    net = next((n for n in data["network"] if n["name"] != "lo" and n["up"]), {})
    with DB_LOCK, db() as con:
        con.execute("INSERT OR REPLACE INTO samples VALUES (?,?,?,?,?,?)", (
            data["time"], data["cpu"]["percent"], data["memory"]["percent"],
            disk.get("percent", 0), net.get("download", 0), net.get("upload", 0)))
    purge(get_settings()["retention_days"])


def history(hours):
    start = time.time() - hours * 3600
    bucket = max(60, int(hours * 3600 / 500))
    with DB_LOCK, db() as con:
        rows = con.execute("SELECT CAST(ts / ? AS INTEGER) * ?, AVG(cpu), AVG(ram), AVG(disk), AVG(rx), AVG(tx) FROM samples WHERE ts >= ? GROUP BY CAST(ts / ? AS INTEGER) ORDER BY 1",
                           (bucket, bucket, start, bucket)).fetchall()
    return [{"time": r[0], "cpu": r[1], "ram": r[2], "disk": r[3], "rx": r[4], "tx": r[5]} for r in rows]


def record_loop():
    last_record = 0
    last_purge = 0
    while True:
        try:
            settings = get_settings()
            now = time.time()
            if settings["recording"] and now - last_record >= settings["record_interval"]:
                save_sample(metrics())
                last_record = now
            if now - last_purge >= 3600:
                purge(settings["retention_days"])
                last_purge = now
        except Exception as exc:
            print(f"Historique indisponible : {exc}", flush=True)
        time.sleep(2)


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def _valid_local_request(self, require_origin=False):
        allowed_hosts = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}
        if self.headers.get("Host", "").lower() not in allowed_hosts:
            self.send_error(403, "Host invalide")
            return False
        origin = self.headers.get("Origin")
        allowed_origins = {f"http://127.0.0.1:{PORT}", f"http://localhost:{PORT}"}
        if (require_origin and not origin) or (origin is not None and origin not in allowed_origins):
            self.send_error(403, "Origine invalide")
            return False
        if self.headers.get("Sec-Fetch-Site", "").lower() in {"cross-site", "same-site"}:
            self.send_error(403, "Requête intersite refusée")
            return False
        return True

    def _json(self, obj):
        body = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self._valid_local_request():
            return
        path = urlparse(self.path)
        if path.path == "/api/stats":
            self._json(metrics())
        elif path.path == "/api/settings":
            self._json(get_settings())
        elif path.path == "/api/history":
            hours = max(1, min(24 * 30, int(parse_qs(path.query).get("hours", ["24"])[0])))
            self._json({"points": history(hours), "hours": hours})
        elif path.path.startswith("/locales/"):
            language = Path(path.path).name.removesuffix(".json")
            if language not in LOCALES:
                self.send_error(404)
                return
            body = (ROOT / "locales" / f"{language}.json").read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "public, max-age=3600")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif path.path == "/" or path.path.startswith("/index.html"):
            body = (ROOT / "index.html").read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_error(404)

    def do_POST(self):
        if not self._valid_local_request(require_origin=True):
            return
        if self.path != "/api/settings":
            self.send_error(404)
            return
        try:
            if self.headers.get_content_type() != "application/json":
                self.send_error(415, "Content-Type application/json requis")
                return
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 4096:
                self.send_error(413, "Taille de requête invalide")
                return
            self._json(set_settings(json.loads(self.rfile.read(length) or b"{}")))
        except (ValueError, TypeError, json.JSONDecodeError):
            self.send_error(400, "Configuration invalide")

    def log_message(self, *_args):
        pass


if __name__ == "__main__":
    threading.Thread(target=record_loop, daemon=True, name="history-recorder").start()
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"iLinux Stats prêt sur http://127.0.0.1:{PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
