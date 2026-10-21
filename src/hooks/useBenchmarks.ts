"use client";
import { useEffect, useState } from "react";
import { loadBenchmarks, type Benchmarks } from "@/lib/benchmarks";

/** Bundled EU Oil Bulletin data, loaded after first paint. */
export function useBenchmarks(): Benchmarks | null {
  const [data, setData] = useState<Benchmarks | null>(null);
  useEffect(() => {
    let alive = true;
    loadBenchmarks().then((b) => alive && setData(b));
    return () => {
      alive = false;
    };
  }, []);
  return data;
}
