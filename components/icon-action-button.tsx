"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type IconActionButtonProps = ComponentProps<typeof Button> & {
  label: string;
  icon: React.ReactNode;
};

export function IconActionButton({
  label,
  icon,
  className,
  variant = "ghost",
  size = "icon",
  ...props
}: IconActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn("h-8 w-8", className)}
          aria-label={label}
          {...props}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function LinkIconButton({
  label,
  icon,
  href,
  className,
}: {
  label: string;
  icon: React.ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-8 w-8", className)} asChild>
          <Link href={href} aria-label={label}>
            {icon}
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
