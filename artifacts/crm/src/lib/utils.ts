import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateString: string) {
  return format(new Date(dateString), "MMM d, yyyy");
}

export function formatTime(dateString: string) {
  return format(new Date(dateString), "MMM d, yyyy h:mm a");
}

export function formatRelativeTime(dateString: string) {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

export function getStatusColor(status: string) {
  switch (status) {
    case "new":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "contacted":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    case "qualified":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "proposal":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
    case "converted":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "lost":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
    default:
      return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case "new":
      return "New Lead";
    case "contacted":
      return "Contacted";
    case "qualified":
      return "Qualified";
    case "proposal":
      return "Proposal Sent";
    case "converted":
      return "Converted";
    case "lost":
      return "Lost";
    default:
      return status;
  }
}
