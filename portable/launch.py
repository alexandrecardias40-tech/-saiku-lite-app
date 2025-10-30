"""Portable launcher for Saiku Lite.

This script bootstraps the local Node.js backend (built bundle) and then
starts the Flask application. It is intended to run from a thumb drive
where the project tree has been copied with the pre-built dashboard assets.
"""
from __future__ import annotations

import os
import shutil
import signal
import subprocess
import sys
import time
import webbrowser
from pathlib import Path
from typing import Optional


LOG_DIR = Path(__file__).resolve().parent / "logs"
LOG_FILE = LOG_DIR / "launch.log"


ROOT_DIR = Path(__file__).resolve().parent.parent
NODE_DIST_DIR = ROOT_DIR / "unb-budget-dashboard" / "dist"
NODE_PUBLIC_DIR = NODE_DIST_DIR / "public"


def _print(msg: str) -> None:
    text = msg + os.linesep
    try:
        sys.stdout.write(text)
        sys.stdout.flush()
    except Exception:
        pass
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        with LOG_FILE.open("a", encoding="utf-8") as fp:
            fp.write(text)
    except Exception:
        pass


def _find_node_binary() -> Path:
    """Try to locate a Node.js binary that can run the bundled server."""
    candidates = [
        os.environ.get("SAIKU_NODE_BIN"),
        ROOT_DIR / "portable" / "node" / "node.exe",
        ROOT_DIR / "portable" / "node" / "bin" / "node",
        ROOT_DIR / "node" / "node.exe",
        ROOT_DIR / "node" / "bin" / "node",
        shutil.which("node"),
    ]
    for raw in candidates:
        if not raw:
            continue
        path = Path(raw).expanduser()
        if path.exists():
            return path
    raise FileNotFoundError(
        "Node.js executable not found. Place it under portable/node/ or install Node on the machine."
    )


def _start_node(node_path: Path) -> Optional[subprocess.Popen]:
    if not NODE_DIST_DIR.exists():
        _print(f"[WARN] Node dist folder not found at {NODE_DIST_DIR}. Dashboard API will be unavailable.")
        return None
    index_js = NODE_DIST_DIR / "index.js"
    if not index_js.exists():
        _print(f"[WARN] {index_js} missing. Run `pnpm build` in unb-budget-dashboard before packaging.")
        return None

    env = os.environ.copy()
    env.setdefault("NODE_ENV", "production")
    env.setdefault("PORT", "3000")
    env.setdefault("JWT_SECRET", env.get("JWT_SECRET", "portable-dashboard-secret"))

    _print(f"[INFO] Starting Node backend using {node_path} ...")
    process = subprocess.Popen(
        [str(node_path), "index.js"],
        cwd=str(NODE_DIST_DIR),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    # Give it a moment to bind the port.
    time.sleep(2)
    if process.poll() is not None:
        stderr = process.stderr.read() if process.stderr else ""
        _print("[ERROR] Failed to start Node backend.")
        if stderr:
            _print(stderr.strip())
        return None
    return process


def _set_default_env() -> None:
    os.environ.setdefault("FLASK_ENV", "production")
    os.environ.setdefault("SAIKU_SECRET_KEY", "portable-saiku-secret")
    os.environ.setdefault("SAIKU_ADMIN_USERNAME", "admin")
    os.environ.setdefault("SAIKU_ADMIN_PASSWORD", "senha123")
    os.environ.setdefault("DASHBOARD_API_URL", "http://127.0.0.1:3000")
    os.environ.setdefault("UNB_DASHBOARD_PUBLIC", str(NODE_PUBLIC_DIR))
    os.environ.setdefault("DASHBOARD_NODE_DIR", str(NODE_DIST_DIR))
    # Ensure project root is importable
    if str(ROOT_DIR) not in sys.path:
        sys.path.insert(0, str(ROOT_DIR))


def _import_flask_app():
    try:
        from src.app import app  # type: ignore
    except ModuleNotFoundError:
        _print("[ERROR] Could not import src.app. Check PYTHONPATH and project structure.")
        raise
    return app


def _open_browser(url: str) -> None:
    try:
        webbrowser.open_new(url)
    except Exception:
        _print(f"[WARN] Unable to open browser automatically. Access manually: {url}")


def main() -> None:
    _print("=== Saiku Lite Portable Launcher ===")
    _set_default_env()

    node_process = None
    try:
        node_bin = _find_node_binary()
        node_process = _start_node(node_bin)
    except FileNotFoundError as exc:
        _print(f"[WARN] {exc}")
        _print("Dashboard features that depend on Node will be disabled.")

    app = _import_flask_app()
    _open_browser("http://127.0.0.1:5000")

    _print("[INFO] Starting Flask server on http://127.0.0.1:5000")
    try:
        app.run(host="0.0.0.0", port=5000, use_reloader=False)
    except KeyboardInterrupt:
        _print("\n[INFO] Shutdown requested by user.")
    finally:
        if node_process and node_process.poll() is None:
            _print("[INFO] Stopping Node backend...")
            for sig in (signal.SIGINT, signal.SIGTERM):
                try:
                    node_process.send_signal(sig)
                    node_process.wait(timeout=3)
                    break
                except Exception:
                    continue
            if node_process.poll() is None:
                node_process.kill()
        _print("[INFO] Saiku Lite portable session ended.")


if __name__ == "__main__":
    main()
