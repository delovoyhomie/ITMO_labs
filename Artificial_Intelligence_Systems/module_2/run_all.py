"""Запуск двух лабораторных одним интерпретатором, без shell-команд."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
for relative in ("lab_4/lab4_knn.py", "lab_5/lab5_tree.py"):
    subprocess.run([sys.executable, str(ROOT / relative)], check=True)
