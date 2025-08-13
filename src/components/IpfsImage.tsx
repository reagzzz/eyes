"use client";

import { useEffect, useMemo, useState } from "react";
import { ipfsToHttpCandidates } from "@/lib/ipfs";

type Props = {
  src: string;
  alt?: string;
  className?: string;
};

export default function IpfsImage({ src, alt = "", className }: Props) {
  const candidates = useMemo(() => ipfsToHttpCandidates(src), [src]);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    setIndex(0);
    setCurrent(candidates[0] ?? null);
  }, [candidates]);

  if (!current) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      className={className}
      onError={() => {
        const next = index + 1;
        if (next < candidates.length) {
          setIndex(next);
          setCurrent(candidates[next]);
        }
      }}
      loading="lazy"
      decoding="async"
    />
  );
}


