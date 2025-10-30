#!/bin/bash
set -euo pipefail

# Resolve directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTABLE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${PORTABLE_DIR}/.." && pwd)"

PYTHON_CMD="$(command -v python3 || true)"
VENV_DIR="${PORTABLE_DIR}/mac/venv"

if [[ -z "${PYTHON_CMD}" ]]; then
  echo "[ERRO] Nenhum interpretador Python3 encontrado no sistema." >&2
  exit 1
fi

if [[ ! -d "${VENV_DIR}" ]]; then
  echo "[INFO] Criando ambiente virtual portátil..."
  "${PYTHON_CMD}" -m venv "${VENV_DIR}"
fi

PIP_BIN="${VENV_DIR}/bin/pip"
PY_BIN="${VENV_DIR}/bin/python"

if [[ ! -x "${PY_BIN}" ]]; then
  echo "[ERRO] Ambiente virtual inválido em ${VENV_DIR}." >&2
  exit 1
fi

if [[ ! -f "${VENV_DIR}/.deps_installed" ]]; then
  echo "[INFO] Instalando dependências Python..."
  "${PIP_BIN}" install --upgrade pip wheel
  "${PIP_BIN}" install -r "${PROJECT_ROOT}/requirements.txt"
  touch "${VENV_DIR}/.deps_installed"
fi

echo "Iniciando Saiku Lite a partir do pendrive..."
cd "${PROJECT_ROOT}"
"${PY_BIN}" "${PORTABLE_DIR}/launch.py"

read -n 1 -s -r -p $'\nPressione qualquer tecla para fechar...'
