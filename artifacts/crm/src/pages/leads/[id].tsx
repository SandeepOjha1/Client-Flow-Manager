import { useParams, Link } from "wouter";
import { 
  useGetLead, 
  useUpdateLeadStatus, 
  useListNotes, 
  useCreateNote,
  useListFollowups,
  useCreateFollowup,
  useUpdateFollowup,
  LeadStatus,
  getGetLeadQueryKey,
  getListNotesQueryKey,
  getListFollowupsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { LeadStatusBadge } from "@/components/lead-status-badge";
import { formatCurrency, formatTime, formatDate, getStatusColor } from "@/lib/utils";
import { ArrowLeft, Building, Mail, Phone, Calendar, Loader2, Send } from "lucide-react";

const noteSchema = z.object({
  content: z.string().min(1, "Note cannot be empty"),
});

const followupSchema = z.object({
  description: z.string().min(1, "Description is required"),
  dueDate: z.string().min(1, "Due date is required"),
});

export default function LeadDetail() {
  const params = useParams();
  const leadId = Number(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lead, isLoading: leadLoading } = useGetLead(leadId, {
    query: { enabled: !!leadId, queryKey: getGetLeadQueryKey(leadId) }
  });

  const { data: notes, isLoading: notesLoading } = useListNotes(leadId, {
    query: { enabled: !!leadId, queryKey: getListNotesQueryKey(leadId) }
  });

  const { data: followups, isLoading: followupsLoading } = useListFollowups(leadId, {
    query: { enabled: !!leadId, queryKey: getListFollowupsQueryKey(leadId) }
  });

  const updateStatus = useUpdateLeadStatus({
    mutation: {
      onMutate: async (newStatus) => {
        await queryClient.cancelQueries({ queryKey: getGetLeadQueryKey(leadId) });
        const previousLead = queryClient.getQueryData(getGetLeadQueryKey(leadId));
        queryClient.setQueryData(getGetLeadQueryKey(leadId), (old: any) => ({
          ...old,
          status: newStatus.data.status,
        }));
        return { previousLead };
      },
      onError: (err, newStatus, context: any) => {
        queryClient.setQueryData(getGetLeadQueryKey(leadId), context.previousLead);
        toast({ title: "Failed to update status", variant: "destructive" });
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
      }
    }
  });

  const noteForm = useForm<z.infer<typeof noteSchema>>({
    resolver: zodResolver(noteSchema),
    defaultValues: { content: "" },
  });

  const createNote = useCreateNote({
    mutation: {
      onSuccess: () => {
        noteForm.reset();
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey(leadId) });
        toast({ title: "Note added" });
      }
    }
  });

  const followupForm = useForm<z.infer<typeof followupSchema>>({
    resolver: zodResolver(followupSchema),
    defaultValues: { description: "", dueDate: "" },
  });

  const createFollowup = useCreateFollowup({
    mutation: {
      onSuccess: () => {
        followupForm.reset();
        queryClient.invalidateQueries({ queryKey: getListFollowupsQueryKey(leadId) });
        toast({ title: "Follow-up scheduled" });
      }
    }
  });

  const updateFollowup = useUpdateFollowup({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFollowupsQueryKey(leadId) });
      }
    }
  });

  if (leadLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] col-span-1" />
          <Skeleton className="h-[400px] col-span-2" />
        </div>
      </div>
    );
  }

  if (!lead) return <div>Lead not found</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{lead.name}</h1>
        </div>
        <Select 
          value={lead.status} 
          onValueChange={(value) => updateStatus.mutate({ id: leadId, data: { status: value as LeadStatus } })}
        >
          <SelectTrigger className={`w-[180px] font-semibold border-none text-white ${getStatusColor(lead.status).split(' ')[0]} bg-opacity-100`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(LeadStatus).map((status) => (
              <SelectItem key={status} value={status} className="uppercase text-xs font-bold tracking-wider">
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Panel */}
        <div className="space-y-6 md:col-span-1">
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-medium">
                  {lead.email}
                </div>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="flex-1 font-medium">{lead.phone}</div>
                </div>
              )}
              {lead.company && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    <Building className="h-4 w-4" />
                  </div>
                  <div className="flex-1 font-medium">{lead.company}</div>
                </div>
              )}
              
              <div className="pt-4 mt-4 border-t border-border grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Value</p>
                  <p className="font-semibold text-lg">{lead.value ? formatCurrency(lead.value) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Source</p>
                  <p className="font-medium">{lead.source}</p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Added {formatDate(lead.createdAt)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Notes & Followups */}
        <div className="md:col-span-2">
          <Card className="h-full shadow-sm border-border flex flex-col">
            <Tabs defaultValue="notes" className="flex-1 flex flex-col">
              <CardHeader className="pb-0 border-b border-border">
                <TabsList className="w-full justify-start bg-transparent h-auto p-0">
                  <TabsTrigger value="notes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2">
                    Notes
                  </TabsTrigger>
                  <TabsTrigger value="followups" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2">
                    Follow-ups
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              
              <CardContent className="flex-1 p-0 flex flex-col">
                <TabsContent value="notes" className="m-0 flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
                    {notesLoading ? (
                      <Skeleton className="h-20 w-full" />
                    ) : notes?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No notes yet.</div>
                    ) : (
                      notes?.map((note) => (
                        <div key={note.id} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-2 border border-border">
                          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{note.authorName}</span>
                            <span>{formatTime(note.createdAt)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/50">
                    <Form {...noteForm}>
                      <form onSubmit={noteForm.handleSubmit((v) => createNote.mutate({ id: leadId, data: v }))} className="flex gap-2">
                        <FormField
                          control={noteForm.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input placeholder="Type a note..." className="bg-background" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button type="submit" size="icon" disabled={createNote.isPending}>
                          {createNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </TabsContent>

                <TabsContent value="followups" className="m-0 flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]">
                    {followupsLoading ? (
                      <Skeleton className="h-16 w-full" />
                    ) : followups?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No follow-ups scheduled.</div>
                    ) : (
                      followups?.map((item) => (
                        <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border ${item.completed ? 'bg-slate-50/50 dark:bg-slate-900/50 opacity-60' : 'bg-white dark:bg-slate-950'}`}>
                          <Checkbox 
                            checked={item.completed} 
                            onCheckedChange={(checked) => updateFollowup.mutate({ id: leadId, followupId: item.id, data: { completed: !!checked } })}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>{item.description}</p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(item.dueDate)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/50">
                    <Form {...followupForm}>
                      <form onSubmit={followupForm.handleSubmit((v) => createFollowup.mutate({ id: leadId, data: v }))} className="flex gap-2">
                        <FormField
                          control={followupForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input placeholder="Follow-up task..." className="bg-background" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={followupForm.control}
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="date" className="bg-background w-[140px]" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button type="submit" disabled={createFollowup.isPending}>
                          Add
                        </Button>
                      </form>
                    </Form>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}