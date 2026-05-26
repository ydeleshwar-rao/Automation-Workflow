import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Input } from "./input";

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
  iconClassName?: string;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, containerClassName, iconClassName, ...props }, ref) => {
    return (
      <div className={cn("relative flex items-center w-full group", containerClassName)}>
        <Search 
          className={cn(
            "absolute left-3 w-4 h-4 text-slate-400 group-focus-within:text-orange-500 transition-colors pointer-events-none", 
            iconClassName
          )} 
        />
        <Input
          className={cn(
            "pl-10 h-10 bg-white border-slate-200 focus-visible:ring-1 focus-visible:ring-orange-500/30 transition-all", 
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

export { SearchInput };
