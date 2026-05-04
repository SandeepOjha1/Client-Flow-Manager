import { useGetPipeline, LeadStatus } from "@workspace/api-client-react";
import { getStatusColor, formatCurrency } from "@/lib/utils";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Mail, Building } from "lucide-react";

const STATUS_ORDER = [
  LeadStatus.new,
  LeadStatus.contacted,
  LeadStatus.qualified,
  LeadStatus.proposal,
  LeadStatus.converted,
  LeadStatus.lost
];

export default function Pipeline() {
  const { data: pipeline, isLoading } = useGetPipeline();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1,2,3,4].map(i => (
            <Skeleton key={i} className="h-[600px] w-80 shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  const stagesMap = new Map((pipeline?.stages || []).map(s => [s.status, s]));

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Pipeline</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
          <p>Total Value: <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(pipeline?.totalValue || 0)}</span></p>
          <span>•</span>
          <p>Total Leads: <span className="font-semibold text-slate-900 dark:text-white">{pipeline?.totalLeads || 0}</span></p>
        </div>
      </div>

      <ScrollArea className="flex-1 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex h-full gap-4 pb-4">
          {STATUS_ORDER.map((status) => {
            const stage = stagesMap.get(status);
            const count = stage?.count || 0;
            const value = stage?.value || 0;
            const leads = stage?.leads || [];

            return (
              <div key={status} className="w-[300px] shrink-0 flex flex-col bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-border">
                <div className="p-3 border-b border-border bg-white dark:bg-slate-950 rounded-t-xl sticky top-0 z-10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-bold uppercase tracking-wider text-xs px-2 py-1 rounded ${getStatusColor(status).replace('bg-', 'bg-opacity-20 text-').split(' ')[0]} ${getStatusColor(status).split(' ')[1]}`}>
                      {status}
                    </h3>
                    <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">{count}</span>
                  </div>
                  <p className="text-sm font-medium">{formatCurrency(value)}</p>
                </div>

                <div className="p-3 flex-1 overflow-y-auto space-y-3">
                  {leads.map((lead) => (
                    <Link key={lead.id} href={`/leads/${lead.id}`}>
                      <Card className="cursor-pointer hover:border-primary/50 transition-colors shadow-sm hover:shadow-md hover-elevate">
                        <CardContent className="p-3 space-y-2">
                          <div className="font-semibold text-sm leading-tight text-slate-900 dark:text-slate-100">
                            {lead.name}
                          </div>
                          {lead.company && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Building className="h-3 w-3 shrink-0" />
                              <span className="truncate">{lead.company}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {lead.value ? formatCurrency(lead.value) : "—"}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              {lead.source}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                  {leads.length === 0 && (
                    <div className="h-24 flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg bg-transparent">
                      Drop leads here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}