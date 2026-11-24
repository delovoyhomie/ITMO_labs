"""Отчёт использует GPSS только после полной проверки всех серий."""
import json
from model import ROOT


def current_results():
    native=ROOT/'results'/'gpss'
    metadata=native/'metadata.json'
    if metadata.exists() and json.loads(metadata.read_text()).get('native_complete'):
        return native, True
    return ROOT/'results', False
