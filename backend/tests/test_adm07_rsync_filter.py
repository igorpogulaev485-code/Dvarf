"""ADM-07: rsync-filter защищает .env.bak рядом с .env."""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
FILTER = ROOT / "deploy" / "rsync-filter.txt"


def _protected_names(filter_text: str) -> set[str]:
    names: set[str] = set()
    for line in filter_text.splitlines():
        line = line.strip()
        if line.startswith("protect "):
            names.add(line[len("protect ") :].strip())
    return names


def test_rsync_filter_protects_env_bak():
    text = FILTER.read_text(encoding="utf-8")
    protected = _protected_names(text)
    assert ".env" in protected
    assert ".env.bak" in protected
    # Не присылаем с раннера и не стираем --delete
    assert "exclude .env.bak" in text
    assert "exclude .env" in text


def test_rsync_dry_run_keeps_env_bak(tmp_path: Path):
    """Прогон с фильтром: .env.bak на «сервере» остаётся при --delete."""
    src = tmp_path / "src"
    dst = tmp_path / "dst"
    src.mkdir()
    dst.mkdir()
    # Разный размер + старый mtime на dst: rsync -a quick-check (size+mtime)
    # иначе может не скопировать "new" поверх "old" той же длины в ту же секунду.
    (src / "app.txt").write_text("new-content\n", encoding="utf-8")
    dst_app = dst / "app.txt"
    dst_app.write_text("old\n", encoding="utf-8")
    os.utime(dst_app, (1_000_000_000, 1_000_000_000))
    (dst / ".env").write_text("SECRET=keep\n", encoding="utf-8")
    (dst / ".env.bak").write_text("SECRET=backup\n", encoding="utf-8")
    (dst / "stale.txt").write_text("delete-me\n", encoding="utf-8")

    if shutil.which("rsync") is None:
        # Без бинаря — проверяем семантику protect из фильтра вручную.
        protected = _protected_names(FILTER.read_text(encoding="utf-8"))
        would_delete = {"stale.txt", "app.txt"}  # app перезапишется, stale уйдёт
        assert ".env.bak" in protected
        assert ".env" in protected
        assert ".env.bak" not in would_delete
        return

    result = subprocess.run(
        [
            "rsync",
            "-a",
            "--delete",
            "--dry-run",
            "--out-format=%i %n",
            f"--filter=merge {FILTER}",
            f"{src}/",
            f"{dst}/",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    out = (result.stdout + result.stderr).lower()
    assert "deleting .env.bak" not in out

    subprocess.run(
        [
            "rsync",
            "-a",
            "--delete",
            f"--filter=merge {FILTER}",
            f"{src}/",
            f"{dst}/",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    assert (dst / ".env").read_text(encoding="utf-8") == "SECRET=keep\n"
    assert (dst / ".env.bak").read_text(encoding="utf-8") == "SECRET=backup\n"
    assert not (dst / "stale.txt").exists()
    assert (dst / "app.txt").read_text(encoding="utf-8") == "new-content\n"
