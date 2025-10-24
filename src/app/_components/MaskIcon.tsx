"use client";

export default function MaskIcon({
  src,
  className = "",
  color = "white",
}: {
  src: string;
  className?: string;
  color?: string;
}) {
  return (
    <span
      className={className}
      style={{
        backgroundColor: color,
        WebkitMask: `url(${src}) center / contain no-repeat`,
        mask: `url(${src}) center / contain no-repeat`,
        display: "inline-block",
      }}
    />
  );
}
