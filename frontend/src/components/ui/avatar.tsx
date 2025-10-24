import * as React from "react";

import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  fallback?: string;
  imageSrc?: string;
}

export function Avatar({ imageSrc, fallback, className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-muted text-xs font-medium uppercase text-muted-foreground",
        className
      )}
      {...props}
    >
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt={fallback ?? ""} className="h-full w-full object-cover" />
      ) : (
        <span className="m-auto">{fallback}</span>
      )}
    </div>
  );
}

