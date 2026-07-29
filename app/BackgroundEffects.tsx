const CLOUDS = [
  { top: "8%", left: "-4%", size: 260, opacity: 0.5, animation: "drift-slow" },
  { top: "58%", left: "68%", size: 320, opacity: 0.4, animation: "float-slow" },
  { top: "2%", left: "62%", size: 180, opacity: 0.35, animation: "float-medium" },
];

const CIRCLES = [
  { top: "14%", left: "12%", size: 18, animation: "float-medium" },
  { top: "22%", left: "82%", size: 12, animation: "float-fast" },
  { top: "68%", left: "8%", size: 14, animation: "float-slow" },
  { top: "78%", left: "88%", size: 20, animation: "float-medium" },
  { top: "40%", left: "92%", size: 10, animation: "float-fast" },
];

const STARS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  top: (i * 41) % 100,
  left: (i * 61) % 100,
  size: 4 + (i % 3) * 2,
  delay: (i % 5) * 0.5,
}));

export function BackgroundEffects() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#B0C5F6_0%,#D8E3FB_50%,#FFFFFF_100%)]" />

      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className={`${c.animation} absolute rounded-full bg-white blur-3xl`}
          style={{ top: c.top, left: c.left, width: c.size, height: c.size * 0.5, opacity: c.opacity }}
        />
      ))}

      {CIRCLES.map((c, i) => (
        <div
          key={i}
          className={`${c.animation} absolute rounded-full bg-white/50`}
          style={{ top: c.top, left: c.left, width: c.size, height: c.size }}
        />
      ))}

      {STARS.map((s) => (
        <span
          key={s.id}
          className="twinkle-star absolute rounded-full"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            backgroundColor: "#F6EEBF",
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
