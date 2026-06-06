import { useState } from "react";
import { cn } from "../utils/cn";

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText?: string;
}

export default function LazyImage({
  src,
  className,
  fallbackText,
  alt,
  ...rest
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 text-zinc-600",
          className
        )}
      >
        <span className="px-2 text-center text-xs font-medium line-clamp-3">
          {fallbackText || alt || "No image"}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!loaded && <div className="absolute inset-0 shimmer" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          "h-full w-full object-cover transition-all duration-700",
          loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
        )}
        {...rest}
      />
    </div>
  );
}
