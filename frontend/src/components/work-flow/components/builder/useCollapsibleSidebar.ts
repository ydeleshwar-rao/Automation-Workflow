import { useCallback, useState } from "react";

/** A sidebar that is either pinned open, or unpinned and expanded only while hovered. */
export function useCollapsibleSidebar() {
  const [isPinned, setIsPinned] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  // Pinning opens the sidebar; unpinning collapses it until hovered
  const togglePinned = useCallback(() => {
    const willBePinned = !isPinned;
    setIsPinned(willBePinned);
    setIsOpen(willBePinned);
  }, [isPinned]);

  const expandOnHover = useCallback(() => {
    if (!isPinned) setIsOpen(true);
  }, [isPinned]);

  const collapseOnLeave = useCallback(() => {
    if (!isPinned) setIsOpen(false);
  }, [isPinned]);

  return { isOpen, isPinned, togglePinned, expandOnHover, collapseOnLeave };
}
