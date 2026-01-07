#!/usr/bin/env python3
from pathlib import Path
import hashlib
import argparse

def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def generate(root: Path, out_file: str):
    exts = {'.html', '.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.gif'}
    files = [p for p in sorted(root.rglob('*')) if p.is_file() and (p.suffix.lower() in exts or p.parent.name == 'js')]
    with open(out_file, 'w', encoding='utf-8') as out:
        for p in files:
            rel = p.relative_to(root)
            out.write(f"{sha256_file(p)}  {rel}\n")
    print(f"Wrote {out_file} with {len(files)} entries")


def verify(root: Path, checksum_file: str) -> int:
    expected = {}
    with open(checksum_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\n')
            if not line:
                continue
            parts = line.split(None, 1)
            if len(parts) == 2:
                expected[parts[1].strip()] = parts[0]
    mismatches = []
    for rel, exp in expected.items():
        p = root / rel
        if not p.exists():
            mismatches.append((rel, 'MISSING', exp, '-'))
        else:
            got = sha256_file(p)
            if got != exp:
                mismatches.append((rel, got, exp))
    if mismatches:
        print("Verification failed for", len(mismatches), "files")
        for mm in mismatches[:50]:
            print(*mm)
        return 2
    print("All files verified")
    return 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate or verify SHA256 checksums for this workspace.')
    parser.add_argument('--verify', action='store_true', help='Verify using the checksums file (default: checksums_phase-2-3.txt)')
    parser.add_argument('--output', '-o', default='checksums_phase-2-3.txt', help='Output checksum filename')
    args = parser.parse_args()
    root = Path('.')
    if args.verify:
        raise SystemExit(verify(root, args.output))
    else:
        generate(root, args.output)
