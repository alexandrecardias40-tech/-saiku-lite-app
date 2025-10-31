"""Utilities to load tabular datasets from user uploads."""
from __future__ import annotations

import csv
import io
import json
import os
import re
from typing import List, Optional, Tuple

import pandas as pd


class DataLoaderError(RuntimeError):
    """Raised when an uploaded file cannot be parsed into a DataFrame."""


def _detect_delimiter(sample: str) -> str:
    """Attempt to detect the delimiter used inside a text sample."""
    candidates = [',', ';', '\t', '|', ':']
    try:
        sniffer = csv.Sniffer()
        dialect = sniffer.sniff(sample, delimiters=''.join(candidates))
        delimiter = getattr(dialect, 'delimiter', None)
        if delimiter:
            return delimiter
    except (csv.Error, TypeError):
        pass

    counts = {delim: sample.count(delim) for delim in candidates}
    fallback = max(counts, key=counts.get)
    if counts.get(fallback, 0) > 0:
        return fallback
    return ','


def _read_text_dataframe(content: bytes, delimiter: Optional[str] = None) -> pd.DataFrame:
    text = content.decode('utf-8', errors='ignore')
    sample = text[:4096]
    sep = delimiter or _detect_delimiter(sample)
    return pd.read_csv(io.StringIO(text), sep=sep)


def _read_json_dataframe(content: bytes) -> pd.DataFrame:
    payload = json.loads(content.decode("utf-8"))
    if isinstance(payload, list):
        return pd.DataFrame(payload)
    if isinstance(payload, dict):
        if "data" in payload and isinstance(payload["data"], list):
            return pd.DataFrame(payload["data"])
        return pd.json_normalize(payload)
    raise DataLoaderError("Formato JSON não suportado: é necessário um array de objetos ou campo 'data'.")


def _ensure_unique_columns(columns: List[str]) -> List[str]:
    normalized = []
    seen: dict[str, int] = {}
    for idx, value in enumerate(columns):
        if value is None:
            value = ""
        name = str(value).strip()
        if not name or name.lower().startswith("unnamed:"):
            name = f"coluna_{idx + 1}"
        name = re.sub(r"\s+", " ", name)
        counter = seen.get(name, 0)
        if counter:
            name = f"{name}_{counter + 1}"
        seen[name] = counter + 1
        normalized.append(name)
    return normalized


def _prepare_excel_candidate(frame: pd.DataFrame) -> Optional[pd.DataFrame]:
    if frame.empty:
        return None
    frame = frame.copy()
    frame = frame.replace(r"^\s*$", pd.NA, regex=True)
    frame = frame.dropna(how="all")
    if frame.empty:
        return None

    header_row = None
    max_scan = min(len(frame), 25)
    for idx in range(max_scan):
        row = frame.iloc[idx]
        filled = [str(value).strip() for value in row if pd.notna(value)]
        filled = [value for value in filled if value]
        distinct = set(filled)
        if len(filled) >= 3 and len(distinct) >= 2:
            header_row = idx
            break

    if header_row is None:
        return None

    header_values = frame.iloc[header_row].tolist()
    columns = _ensure_unique_columns(header_values)
    data = frame.iloc[header_row + 1 :].reset_index(drop=True)
    if data.empty:
        return None

    data.columns = columns
    data = data.dropna(how="all")
    data = data.loc[:, ~(data.isna().all())]
    if data.empty:
        return None

    for column in data.columns:
        series = data[column]
        if series.dtype == object:
            data[column] = series.apply(lambda value: value.strip() if isinstance(value, str) else value)

    return data


def _read_excel_dataframe(content: bytes) -> pd.DataFrame:
    buffer = io.BytesIO(content)
    try:
        excel = pd.ExcelFile(buffer)
    except ValueError as exc:
        raise DataLoaderError(f"Não foi possível abrir o arquivo Excel: {exc}") from exc

    best_score: Tuple[int, int] = (-1, -1)
    best_frame: Optional[pd.DataFrame] = None
    for sheet_name in excel.sheet_names:
        raw = excel.parse(sheet_name, header=None, dtype=object)
        candidate = _prepare_excel_candidate(raw)
        if candidate is None:
            continue
        score = (candidate.shape[0], candidate.shape[1])
        if score > best_score:
            best_score = score
            best_frame = candidate
            best_frame.attrs["sheet_name"] = sheet_name

    if best_frame is None:
        raise DataLoaderError("Não foi possível identificar uma aba com cabeçalhos válidos na planilha.")

    return best_frame


def load_dataframe(filename: str, file_content: bytes) -> pd.DataFrame:
    """Return a DataFrame for the uploaded file content."""
    if not filename:
        raise DataLoaderError("Arquivo sem nome não pôde ser processado.")

    ext = os.path.splitext(filename)[1].lower()

    try:
        if ext in {".csv", ".txt"}:
            frame = _read_text_dataframe(file_content)
        elif ext in {".tsv", ".tab"}:
            frame = _read_text_dataframe(file_content, delimiter="\t")
        elif ext in {".xls", ".xlsx"}:
            frame = _read_excel_dataframe(file_content)
        elif ext == ".json":
            frame = _read_json_dataframe(file_content)
        else:
            raise DataLoaderError(f"Extensão de arquivo '{ext}' não é suportada.")
    except UnicodeDecodeError as exc:
        raise DataLoaderError("Erro de decodificação de texto. Verifique a codificação do arquivo.") from exc
    except ValueError as exc:
        raise DataLoaderError(str(exc)) from exc
    except Exception as exc:
        raise DataLoaderError(f"Não foi possível processar o arquivo: {exc}") from exc

    if frame.empty:
        raise DataLoaderError("Arquivo lido, mas nenhum dado foi encontrado.")

    frame.columns = [str(col) for col in frame.columns]
    return frame
