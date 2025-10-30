import ctypes
import datetime
import sys
import traceback
from pathlib import Path

REQUIRED_MODULES = ["flask", "pandas", "openpyxl", "matplotlib", "numpy"]
LOG_FILE = Path(__file__).resolve().with_name("verify_env.log")


def message_box(text: str, title: str = "Saiku Lite") -> None:
    ctypes.windll.user32.MessageBoxW(None, text, title, 0x10)  # MB_ICONERROR


def main() -> int:
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as fp:
        fp.write(f"[{timestamp}] Verificando dependências...\n")

    failures = []
    for name in REQUIRED_MODULES:
        try:
            __import__(name)
        except Exception as exc:  # capture import errors and DLL issues
            failures.append((name, exc))

    if failures:
        with LOG_FILE.open("a", encoding="utf-8") as fp:
            for mod, exc in failures:
                fp.write(f"- {mod}: {exc}\n")
        modules = ", ".join(mod for mod, _ in failures)
        root = Path(__file__).resolve().parents[1]
        wheels_dir = root / "windows" / "wheels"
        message_box(
            "Falha ao carregar módulos: {}\nConsulte o log em {}\nTente recarregar o pendrive ou reinstalar o conteúdo da pasta {}."
            .format(modules, LOG_FILE, wheels_dir)
        )
        return 1

    with LOG_FILE.open("a", encoding="utf-8") as fp:
        fp.write("Tudo OK.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
