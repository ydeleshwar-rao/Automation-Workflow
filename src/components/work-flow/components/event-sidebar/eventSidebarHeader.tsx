import { cn } from "@/src/lib/utils";
import { Maximize2, Pencil, Webhook, X } from "lucide-react";


interface EventSidebarHeaderProps {
  selectedApp?: {
    label: string;
    icon: any;
    color: string;
  }
  isEditingTitle:boolean,
  editedTitle: string,
  setEditedTitle:React.Dispatch<React.SetStateAction<string>>,
  setIsEditingTitle: React.Dispatch<React.SetStateAction<boolean>>,
  nodeIndex:number,
  isTrigger:boolean | undefined,
  onClose: () => void;

}

export function EventSidebarHeader({
    selectedApp,
    isEditingTitle,
    editedTitle,
    setEditedTitle,
    setIsEditingTitle,
    nodeIndex,
    isTrigger,
    onClose
}:EventSidebarHeaderProps){
    return(
        <div className="flex-shrink-0 flex items-center justify-between border-b border-border/60 bg-muted/20 px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "rounded-lg border border-border/60 bg-card p-1.5 shadow-sm",
                        selectedApp?.color,
                      )}
                    >
                      {selectedApp?.icon ? (
                        <selectedApp.icon className="h-4.5 w-4.5 text-primary" />
                      ) : (
                        <Webhook className="h-4.5 w-4.5 text-primary" />
                      )}
                    </div>
        
                    <div className="flex items-center gap-2 group">
                      {isEditingTitle ? (
                        <input
                          autoFocus
                          className="w-40 border-b border-primary bg-transparent text-[13px] font-semibold text-foreground outline-none"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          onBlur={() => setIsEditingTitle(false)}
                          onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
                        />
                      ) : (
                        <div
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => setIsEditingTitle(true)}
                        >
                          <span className="text-[13px] font-semibold text-foreground">
                            {nodeIndex}.{" "}
                            {editedTitle ||
                              selectedApp?.label ||
                              (isTrigger ? "Catch Hook" : "Action")}
                          </span>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      )}
                    </div>
                  </div>
        
                  <div className="flex items-center gap-1">
                    <button
                      className="tooltip rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="Expand"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={onClose}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
    )
}