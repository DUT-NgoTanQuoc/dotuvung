"use client";

import { motion } from "framer-motion";

export function Hero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="flex flex-col items-center gap-3 text-center"
    >
      <h1 className="font-display text-4xl font-bold tracking-tight text-[#334155] sm:text-5xl">
        WORD QUEST
      </h1>

      <p className="max-w-xs text-base font-medium text-[#64748B] sm:max-w-sm">
        Biến việc học từ vựng thành niềm vui mỗi ngày.
      </p>
    </motion.div>
  );
}
