#!/usr/bin/env python3
"""Preview or apply retention to verified local Fotografia backups."""

import argparse
from datetime import datetime, timedelta, timezone
import hashlib
from pathlib import Path
import re
import stat

BACKUP_NAME = re.compile(r"fotografia-(\d{8}T\d{6}Z)-[A-Za-z0-9]{8}")
ARCHIVES = {"fotografia.dump", "photos.tar.gz"}
FILES = ARCHIVES | {"SHA256SUMS"}


def positive(value):
    number = int(value)
    if not 1 <= number <= 36_500:
        raise argparse.ArgumentTypeError("expected an integer from 1 to 36500")
    return number


def is_link(path):
    info = path.lstat()
    attributes = getattr(info, "st_file_attributes", 0)
    return stat.S_ISLNK(info.st_mode) or bool(attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT)


def verified(folder):
    if is_link(folder) or not folder.is_dir():
        return False
    entries = list(folder.iterdir())
    if {entry.name for entry in entries} != FILES:
        return False
    if any(is_link(entry) or not entry.is_file() for entry in entries):
        return False

    manifest = folder / "SHA256SUMS"
    if manifest.stat().st_size > 1024:
        return False
    expected = {}
    for line in manifest.read_text(encoding="ascii", errors="replace").splitlines():
        match = re.fullmatch(r"([a-f0-9]{64})  (fotografia\.dump|photos\.tar\.gz)", line)
        if not match or match[2] in expected:
            return False
        expected[match[2]] = match[1]
    if expected.keys() != ARCHIVES:
        return False
    for filename, digest in expected.items():
        archive = folder / filename
        with archive.open("rb") as stream:
            if not archive.stat().st_size or hashlib.file_digest(stream, "sha256").hexdigest() != digest:
                return False
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--keep", type=positive, required=True, help="minimum verified copies to keep")
    parser.add_argument("--days", type=positive, required=True, help="keep copies at least this many days")
    parser.add_argument("--apply", action="store_true", help="delete eligible copies instead of previewing")
    args = parser.parse_args()
    if not args.directory.is_dir():
        parser.error("backup directory does not exist")

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=args.days)
    candidates = []
    for folder in sorted(args.directory.iterdir(), reverse=True):
        match = BACKUP_NAME.fullmatch(folder.name)
        if not match:
            continue
        try:
            created = datetime.strptime(match[1], "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
        except ValueError:
            print(f"SKIP {folder.name} (invalid date)")
            continue
        if created > now or not verified(folder):
            print(f"SKIP {folder.name} (future date or failed verification)")
            continue
        candidates.append((folder, created))

    if len(candidates) < args.keep:
        print(f"Only {len(candidates)} verified copies; minimum is {args.keep}.")
        return 1

    for index, (folder, created) in enumerate(candidates):
        if index < args.keep or created >= cutoff:
            print(f"KEEP {folder.name}")
        elif not args.apply:
            print(f"WOULD DELETE {folder.name}")
        else:
            # Only remove the exact files checked above, never a recursive tree.
            for filename in sorted(FILES):
                (folder / filename).unlink()
            folder.rmdir()
            print(f"DELETED {folder.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
