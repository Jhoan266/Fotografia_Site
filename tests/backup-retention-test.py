import hashlib
from datetime import datetime, timedelta, timezone
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest


class RetentionTest(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.script = Path(__file__).resolve().parents[1] / "scripts/backup-retention.py"

    def backup(self, age, label="ABCDEFGH"):
        stamp = datetime.now(timezone.utc) - timedelta(days=age)
        folder = self.root / f"fotografia-{stamp:%Y%m%dT%H%M%SZ}-{label}"
        folder.mkdir()
        manifest = []
        for name in ("fotografia.dump", "photos.tar.gz"):
            data = name.encode()
            (folder / name).write_bytes(data)
            manifest.append(f"{hashlib.sha256(data).hexdigest()}  {name}\n")
        (folder / "SHA256SUMS").write_text("".join(manifest), encoding="ascii")
        return folder

    def run_policy(self, *flags, keep=2):
        return subprocess.run(
            [sys.executable, str(self.script), str(self.root), "--keep", str(keep),
             "--days", "30", *flags],
            capture_output=True, text=True,
        )

    def test_preview_and_apply_only_remove_expired_verified_copies(self):
        recent = self.backup(1)
        protected = self.backup(45)
        expired = self.backup(60)
        corrupt = self.backup(90)
        (corrupt / "photos.tar.gz").write_bytes(b"corrupt")
        unexpected = self.backup(100)
        (unexpected / "extra.txt").write_text("keep", encoding="utf-8")
        partial = self.root / ".incomplete.ABCDEFGH"
        partial.mkdir()

        preview = self.run_policy()
        self.assertEqual(preview.returncode, 0, preview.stderr)
        self.assertIn(f"WOULD DELETE {expired.name}", preview.stdout)
        self.assertTrue(expired.exists())

        apply = self.run_policy("--apply")
        self.assertEqual(apply.returncode, 0, apply.stderr)
        self.assertIn(f"DELETED {expired.name}", apply.stdout)
        self.assertEqual(set(self.root.iterdir()), {recent, protected, corrupt, unexpected, partial})

    def test_window_keeps_additional_recent_copies(self):
        recent = {self.backup(1), self.backup(2), self.backup(3)}
        self.backup(60)
        result = self.run_policy("--apply")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(set(self.root.iterdir()), recent)

    def test_insufficient_verified_copies_never_deletes(self):
        older = self.backup(60)
        result = self.run_policy("--apply")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertTrue(older.exists())


if __name__ == "__main__":
    unittest.main()
