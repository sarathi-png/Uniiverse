import { useStore } from "../store/useStore";
import { Info, Close } from "./icons";
import { motion, AnimatePresence } from "framer-motion";

export default function Disclaimer() {
  const { disclaimerDismissed, dismissDisclaimer } = useStore();

  return (
    <AnimatePresence>
      {!disclaimerDismissed && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed left-0 right-0 top-0 z-[100] bg-amber-500/90 text-black shadow-lg backdrop-blur-md"
        >
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-10">
            <Info width={24} height={24} className="shrink-0" />
            <p className="text-xs font-bold leading-tight md:text-sm">
              DISCLAIMER: This website is not responsible for the content playing inside it. It only aggregates and links to third-party streaming providers to view movies and shows.
            </p>
            <button
              onClick={dismissDisclaimer}
              className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/10 transition hover:bg-black/20"
              aria-label="Close disclaimer"
            >
              <Close width={16} height={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
