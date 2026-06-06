import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { MediaItem } from "../api/tmdb";
import CardModal from "./CardModal";

interface CardModalContextValue {
  openCardModal: (item: MediaItem) => void;
  closeCardModal: () => void;
}

const CardModalContext = createContext<CardModalContextValue | null>(null);

export function CardModalProvider({ children }: { children: ReactNode }) {
  const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openCardModal = useCallback((item: MediaItem) => {
    setCurrentItem(item);
    setIsOpen(true);
  }, []);

  const closeCardModal = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setCurrentItem(null), 300);
  }, []);

  return (
    <CardModalContext.Provider value={{ openCardModal, closeCardModal }}>
      {children}
      <CardModal
        isOpen={isOpen}
        item={currentItem}
        onClose={closeCardModal}
      />
    </CardModalContext.Provider>
  );
}

export function useCardModal() {
  const ctx = useContext(CardModalContext);
  if (!ctx) throw new Error("useCardModal must be used within CardModalProvider");
  return ctx;
}
