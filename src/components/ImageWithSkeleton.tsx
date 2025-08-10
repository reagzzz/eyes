"use client";

import { useState } from "react";
import Skeleton from "@/components/Skeleton";

export default function ImageWithSkeleton({ src, alt, className = "", rounded = "rounded-xl" }: { src: string; alt: string; className?: string; rounded?: string; }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative ${rounded} overflow-hidden`}> 
      {!loaded && <Skeleton className={`absolute inset-0 ${rounded}`} />}
      <img
        src={src}
        alt={alt}
        className={`${className} ${rounded} object-cover transition-transform duration-300 will-change-transform hover:scale-[1.02]`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}


