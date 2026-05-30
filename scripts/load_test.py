from __future__ import annotations

import argparse
import json
import statistics
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed


def call_health(base_url: str, _index: int) -> tuple[bool, float, int]:
    started = time.perf_counter()
    request = urllib.request.Request(f"{base_url.rstrip('/')}/health", method="GET")
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            response.read()
            status = response.status
            ok = 200 <= status < 300
    except urllib.error.HTTPError as exc:
        status = exc.code
        ok = False
    except Exception:
        status = 0
        ok = False
    elapsed = time.perf_counter() - started
    return ok, elapsed, status


def post_demo(base_url: str, index: int) -> tuple[bool, float, int]:
    started = time.perf_counter()
    payload = {
        "text": (
            "This draft is functional, but it reads a little stiff. "
            "Please make it clearer and more natural without changing the meaning."
        ),
        "fingerprint": f"launch-load-test-{int(time.time())}-{index}",
    }
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/demo/rewrite",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-Forwarded-For": f"10.10.0.{index % 250}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            response.read()
            status = response.status
            ok = 200 <= status < 300
    except urllib.error.HTTPError as exc:
        status = exc.code
        ok = False
    except Exception:
        status = 0
        ok = False
    elapsed = time.perf_counter() - started
    return ok, elapsed, status


def main() -> None:
    parser = argparse.ArgumentParser(description="Basic concurrent load check for launch smoke testing.")
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--concurrency", type=int, default=50)
    parser.add_argument("--requests", type=int, default=50)
    parser.add_argument("--target", choices=["health", "demo"], default="health")
    args = parser.parse_args()

    target = call_health if args.target == "health" else post_demo
    with ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        futures = [executor.submit(target, args.base_url, index) for index in range(args.requests)]
        results = [future.result() for future in as_completed(futures)]

    latencies = [latency for _, latency, _ in results]
    failures = [status for ok, _, status in results if not ok]
    p95 = statistics.quantiles(latencies, n=20)[18] if len(latencies) >= 20 else max(latencies)

    print(f"requests={len(results)} concurrency={args.concurrency}")
    print(f"success={len(results) - len(failures)} failures={len(failures)}")
    print(f"avg_latency={statistics.mean(latencies):.2f}s p95_latency={p95:.2f}s")
    if failures:
        print(f"failure_statuses={sorted(set(failures))}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
