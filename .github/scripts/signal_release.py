#!/usr/bin/env python3
"""Create the GitHub Release for the latest Signal issue.

Reads data/issues.json, picks the highest issue number, and publishes
tag signal-issue-NN unless that tag or release already exists.
Release notes contain the short teaser plus the Payhip and Pages links.
They never include a full issue body.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ISSUES_PATH = ROOT / "data" / "issues.json"
PAGES_URL = "https://dylan2045ad.github.io/dylan2045-ad/"
TEASER_LIMIT = 400


def load_latest() -> dict:
    data = json.loads(ISSUES_PATH.read_text(encoding="utf-8"))
    issues = data.get("issues") or []
    if not issues:
        raise SystemExit("data/issues.json has no issues")
    latest = max(issues, key=lambda item: int(item["number"]))
    number = int(latest["number"])
    title = str(latest.get("title") or "").strip()
    if not title:
        raise SystemExit(f"issue {number} is missing a title")
    teaser = " ".join(str(latest.get("teaser") or "").split())
    if len(teaser) > TEASER_LIMIT:
        teaser = teaser[: TEASER_LIMIT - 1].rstrip() + "…"
    payhip = str(latest.get("url") or data.get("canonicalPayhip") or "").strip()
    if not payhip.startswith("https://"):
        raise SystemExit("latest issue is missing an https Payhip url")
    kit = data.get("fieldKit") or {}
    kit_url = str(kit.get("url") or "").strip()
    price = str(kit.get("priceLabel") or "").strip()
    date = str(latest.get("date") or "").strip()
    tag = f"signal-issue-{number:02d}"
    release_title = f"The Signal — Issue {number:02d}: {title}"
    lines = [f"{title} ({date})" if date else title, ""]
    if teaser:
        lines.extend([teaser, ""])
    lines.append(f"Read the free issue: {payhip}")
    if kit_url.startswith("https://"):
        kit_label = f"Field Kit ({price})" if price else "Field Kit"
        lines.append(f"{kit_label}: {kit_url}")
    lines.append(f"Landing: {PAGES_URL}")
    return {
        "tag": tag,
        "title": release_title,
        "notes": "\n".join(lines).strip() + "\n",
    }


def exists(tag: str) -> bool:
    view = subprocess.run(
        ["gh", "release", "view", tag],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if view.returncode == 0:
        return True
    remote = subprocess.run(
        ["git", "ls-remote", "--tags", "origin", f"refs/tags/{tag}"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    return bool(remote.stdout.strip())


def head_sha() -> str:
    sha = os.environ.get("GITHUB_SHA", "").strip()
    if sha:
        return sha
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def main() -> int:
    plan = load_latest()
    tag = plan["tag"]
    print(f"Latest release tag: {tag}")
    print(plan["notes"])
    if exists(tag):
        print(f"Tag {tag} already exists. Skipping.")
        return 0
    if os.environ.get("DRY_RUN") == "1":
        print("DRY_RUN=1, not creating the release.")
        return 0
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as handle:
        handle.write(plan["notes"])
        notes_path = handle.name
    try:
        subprocess.run(
            [
                "gh",
                "release",
                "create",
                tag,
                "--title",
                plan["title"],
                "--notes-file",
                notes_path,
                "--target",
                head_sha(),
            ],
            cwd=ROOT,
            check=True,
        )
    finally:
        Path(notes_path).unlink(missing_ok=True)
    print(f"Created {tag}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
