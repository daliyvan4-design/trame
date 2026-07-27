"use client";

import { useEffect, useRef, useState } from "react";

export default function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  delay?: number;
  as?: "div" | "section" | "li";
} & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const Comp = Tag as React.ElementType;
  return (
    <Comp
      ref={ref}
      {...rest}
      className={`reveal${seen ? " seen" : ""}${rest.className ? " " + rest.className : ""}`}
      style={{ animationDelay: `${delay}ms`, ...rest.style }}
    >
      {children}
    </Comp>
  );
}
