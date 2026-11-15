#!/usr/bin/env python3
"""witlu.com adapter for the GPL-3.0 Jiangshan Atlas skill; never writes upstream/."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlencode


def main():
    parser = argparse.ArgumentParser(description="Jiangshan Atlas — witlu.com")
    for name in ["year", "place", "person", "hover"]:
        parser.add_argument("--" + name, default="")
    parser.add_argument("--stop", type=int)
    parser.add_argument("--lang", choices=["zh", "zh-tw", "en"], default="zh")
    parser.add_argument("--inspect", action="store_true")
    parser.add_argument("--out", default="")
    args = parser.parse_args()
    if not args.year and not args.person:
        parser.error("Either --year or --person is required")
    query = {k: v for k, v in vars(args).items() if k not in ["inspect", "out"] and v is not None and v != ""}
    base = os.environ.get("JIANGSHAN_PUBLIC_URL", "https://witlu.com").rstrip("/")
    url = base + "/?" + urlencode(query)
    print("URL: " + url)
    root = Path(os.environ.get("JIANGSHAN_REPO_ROOT", Path(__file__).resolve().parents[3])).resolve()
    if args.inspect:
        message = {"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "inspect_person" if args.person else "inspect_place", "arguments": query}}
        result = subprocess.run(["node", str(root / "scripts/mcp-server.mjs")], input=json.dumps(message) + "\n", capture_output=True, text=True, encoding="utf-8", timeout=60, check=True)
        data = json.loads(result.stdout)
        if data.get("error") or data["result"].get("isError"):
            raise RuntimeError(data)
        print("Inspect: " + data["result"]["content"][0]["text"])
    if args.out:
        subprocess.run(["node", str(root / "scripts/render-atlas.mjs"), url, str(Path(args.out).resolve())], timeout=120, check=True)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print("Error: " + str(error), file=sys.stderr)
        sys.exit(1)
