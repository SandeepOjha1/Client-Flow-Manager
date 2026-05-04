import { useGetDashboardStats, useGetRecentActivity, useGetUpcomingFollowups } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatRelativeTime, formatDate } from "@/lib/utils";
import { Users, DollarSign, Target, CalendarClock } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ limit: 10 });
  const { data: followups, isLoading: followupsLoading } = useGetUpcomingFollowups({ limit: 5 });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your sales pipeline and activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-3xl font-bold tracking-tight">{stats?.totalLeads}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-emerald-500 font-medium">+{stats?.newLeads}</span> new this month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-3xl font-bold tracking-tight">{formatCurrency(stats?.totalPipelineValue || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all active stages
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-3xl font-bold tracking-tight">{stats?.conversionRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Converted / Total Leads
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Follow-ups</CardTitle>
            <CalendarClock className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-3xl font-bold tracking-tight">{stats?.pendingFollowups}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.overdueFollowups ? (
                    <span className="text-rose-500 font-medium">{stats.overdueFollowups} overdue</span>
                  ) : (
                    <span>All caught up</span>
                  )}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm border-border">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across all your leads.</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-6">
                {[1,2,3].map(i => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {activity?.map((item) => (
                  <div key={item.id} className="flex gap-4 items-start">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {item.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        for <Link href={`/leads/${item.leadId}`} className="font-medium text-primary hover:underline hover:text-primary/80 transition-colors">{item.leadName}</Link>
                        <span className="mx-2 text-slate-300 dark:text-slate-700">•</span>
                        {formatRelativeTime(item.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {!activity?.length && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <Target className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">No recent activity</p>
                    <p className="text-xs text-muted-foreground mt-1">Activity will show up here once you start interacting with leads.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-sm border-border">
          <CardHeader>
            <CardTitle>Upcoming Follow-ups</CardTitle>
            <CardDescription>Don't miss these scheduled actions.</CardDescription>
          </CardHeader>
          <CardContent>
            {followupsLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {followups?.map((item) => {
                  const isOverdue = new Date(item.dueDate) < new Date();
                  return (
                    <div key={item.id} className={`flex flex-col gap-2 p-3 rounded-lg border ${isOverdue ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/30 dark:border-slate-800'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">{item.description}</p>
                        <Badge variant={isOverdue ? "destructive" : "secondary"} className="shrink-0 text-[10px] uppercase font-bold tracking-wider">
                          {formatDate(item.dueDate)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        <Link href={`/leads/${item.leadId}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                          <Users className="h-3 w-3" />
                          {(item as any).leadName || `Lead #${item.leadId}`}
                        </Link>
                      </p>
                    </div>
                  );
                })}
                {!followups?.length && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <CalendarClock className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">You're all caught up</p>
                    <p className="text-xs text-muted-foreground mt-1">No pending follow-ups scheduled.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}