import { Badge } from "@/components/ui/badge";
import { getStatusColor, getStatusLabel } from "@/lib/utils";
import { LeadStatus } from "@workspace/api-client-react";

export function LeadStatusBadge({ status, className }: { status: LeadStatus | string; className?: string }) {
  return (
    <Badge variant="outline" className={`${getStatusColor(status)} border-0 font-medium whitespace-nowrap uppercase tracking-wider text-[10px] px-2 py-0.5 ${className}`}>
      {getStatusLabel(status)}
    </Badge>
  );
}