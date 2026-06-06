import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store/useStore";
import { Sparkle, Play, Server, Globe } from "./icons";

const SLIDES = [
  {
    Icon: Sparkle,
    title: "Welcome to NOVASTREAM",
    desc: "A next-generation cinematic streaming experience built for the modern viewer.",
  },
  {
    Icon: Play,
    title: "Watch Anything, Anywhere",
    desc: "Millions of movies & shows in stunning 4K HDR. Resume across devices instantly.",
  },
  {
    Icon: Server,
    title: "Bulletproof Streaming",
    desc: "Multi-server architecture with auto-failover keeps playback smooth & reliable.",
  },
  {
    Icon: Globe,
    title: "Anime, K-Drama & More",
    desc: "Curated worldwide content with AI-powered mood recommendations just for you.",
  },
];

export default function Onboarding() {
  const { user, setUser } = useStore();
  const [step, setStep] = useState(0);
  if (user) return null;

  const finish = () => setUser({ name: "Guest", guest: true });
  const slide = SLIDES[step];
  const Icon = slide.Icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[#050507]">
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-violet-600/30 blur-[140px] animate-float-glow" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-[140px] animate-float-glow" />

      <div className="relative w-full max-w-md px-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-violet-500 to-fuchsia-600 neon-border">
              <Icon width={44} height={44} className="text-white" />
            </div>
            <h1 className="mb-4 text-3xl font-black tracking-tight text-glow">
              {slide.title}
            </h1>
            <p className="mb-10 text-zinc-400">{slide.desc}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mb-8 flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-8 bg-violet-400" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-4">
          <button
            onClick={finish}
            className="text-sm text-zinc-500 transition hover:text-white"
          >
            Skip
          </button>
          <button
            onClick={() => (step < SLIDES.length - 1 ? setStep(step + 1) : finish())}
            className="rounded-full bg-white px-8 py-3 font-bold text-black transition hover:scale-105"
          >
            {step < SLIDES.length - 1 ? "Next" : "Start Watching"}
          </button>
        </div>
      </div>
    </div>
  );
}
