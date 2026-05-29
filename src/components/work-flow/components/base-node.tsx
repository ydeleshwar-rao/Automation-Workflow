import React from "react";
import { Copy, Pencil, Zap, MoreVertical, Trash2, ClipboardPaste } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface BaseNodeProps {
  index: number;
  label: string;
  description: string;
  type: "trigger" | "action";
  className?: string;
  onClick?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  // Dynamic props
  appLabel?: string;
  appIcon?: any;
  appColor?: string;
  eventLabel?: string;
  isActive?: boolean;
}

export function BaseNode({
  index,
  label,
  description,
  type,
  className,
  onClick,
  onDelete,
  onDuplicate,
  appLabel,
  appIcon: AppIcon,
  appColor,
  eventLabel,
  isActive
}: BaseNodeProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const isConfigured = !!appLabel && !!eventLabel;

  React.useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleAction = (action: () => void) => {
    setShowMenu(false);
    action();
  };

  const MenuDropdown = () => (
    <div className="absolute left-full top-0 ml-1 w-44 bg-popover border border-border rounded-lg shadow-xl z-50 py-1.5 overflow-hidden">
      <button
        onClick={(e) => { e.stopPropagation(); handleAction(() => {}); }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-popover-foreground hover:bg-muted transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-medium">Rename</span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); handleAction(() => onDuplicate?.()); }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-popover-foreground hover:bg-muted transition-colors"
      >
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-medium">Duplicate</span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); handleAction(() => {}); }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-popover-foreground hover:bg-muted transition-colors"
      >
        <ClipboardPaste className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-medium">Copy</span>
      </button>
      <div className="my-1 border-t border-border" />
      {type !== 'trigger' && (
        <button
          onClick={(e) => { e.stopPropagation(); handleAction(() => onDelete?.()); }}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-popover-foreground hover:bg-destructive/10 hover:text-destructive transition-colors group/delete"
        >
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground group-hover/delete:text-destructive" />
          <span className="font-medium">Delete</span>
        </button>
      )}
    </div>
  );

  if (!isConfigured) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "group relative flex flex-col items-start p-5 w-[440px] rounded-2xl transition-all cursor-pointer",
          "border-2 border-dashed",
          isActive
            ? "nm-inset bg-primary/5 border-primary/50"
            : "nm-card border-border/40 hover:border-primary/35",
          className
        )}
      >
        <div className="flex items-center justify-between w-full mb-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider text-primary nm-inset bg-primary/8">
            <div className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground">
              <Zap className="w-2.5 h-2.5 fill-current" />
            </div>
            {label}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={handleMenuClick}
              className="p-1 hover:bg-muted rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && <MenuDropdown />}
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-foreground">{index}.</span>
          <p className="text-base text-muted-foreground font-medium">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-start p-3 w-[440px] rounded-2xl transition-all cursor-pointer",
        isActive
          ? "nm-inset bg-primary/5 border border-primary/30"
          : "nm-card hover:brightness-[1.01]",
        className
      )}
    >
      {/* App Pill */}
      <div className="flex items-center justify-between w-full mb-2">
        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-bold", appColor || "bg-accent border-border text-accent-foreground")}>
          {AppIcon && <AppIcon className="w-3.5 h-3.5" />}
          {appLabel}
        </div>

        <div className="relative">
          <button
            onClick={handleMenuClick}
            className="p-1.5 hover:bg-muted rounded-md text-muted-foreground"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && <MenuDropdown />}
        </div>
      </div>

      <div className="flex items-center gap-2 px-1.5 pb-2">
        <span className="text-base font-black text-foreground">{index}.</span>
        <p className="text-base text-foreground font-bold">{eventLabel}</p>
      </div>

      {/* Connection Point Marker */}
      {isActive && (
        <div className="absolute -left-0.5 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
      )}
    </div>
  );
}
