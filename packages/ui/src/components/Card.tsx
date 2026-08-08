import * as React from "react";

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-calm-100 bg-white p-4 shadow-sm ${className}`}
      {...props}
    />
  );
}
