import asyncio
import time

from httpx import AsyncClient


async def benchmark_stats_endpoints(base_url: str = "http://127.0.0.1:8000", total_requests: int = 100):
    """Simple asynchronous benchmark script to test Stats endpoints under load."""
    print(f"Starting benchmark test: {total_requests} requests to {base_url}/api/stats/global")
    async with AsyncClient(base_url=base_url) as client:
        start_time = time.perf_counter()

        tasks = [client.get("/api/stats/global") for _ in range(total_requests)]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        elapsed = time.perf_counter() - start_time
        successful = sum(1 for r in responses if getattr(r, "status_code", None) == 200)

        print(f"Completed {total_requests} requests in {elapsed:.4f} seconds.")
        print(f"Successful requests (200 OK): {successful}/{total_requests}")
        print(f"Throughput: {total_requests / elapsed:.2f} req/sec")


if __name__ == "__main__":
    asyncio.run(benchmark_stats_endpoints())
