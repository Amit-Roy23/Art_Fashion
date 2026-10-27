"use client";

import * as React from "react";
import { formatISTDateTime } from "@/lib/utils";
import {
  Clock,
  User,
  ArrowRight,
  FileCheck,
  Truck,
  Wrench,
  Package,
} from "lucide-react";
import { PhotoGallery } from "@/components/photo/PhotoGallery";
import { PhotoInput } from "@/schemas/photo";

export interface TimelineEvent {
  id: string;
  action?: string;
  title?: string;
  remarks?: string;
  userName?: string;
  userRole?: string;
  at?: Date | string;
  timestamp?: Date | string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  photos?: any[];
}

interface TimelineProps {
  events: TimelineEvent[];
}

function getActionIcon(action: string) {
  const act = action.toUpperCase();
  if (act.includes("DELIVER")) return <Truck className="h-4 w-4 text-emerald-600" />;
  if (act.includes("ASSIGN") || act.includes("WORK_ORDER"))
    return <Wrench className="h-4 w-4 text-amber-600" />;
  if (act.includes("JOB_WORK") || act.includes("POLISH"))
    return <Package className="h-4 w-4 text-purple-600" />;
  if (act.includes("APPROVE") || act.includes("SUBMIT"))
    return <FileCheck className="h-4 w-4 text-blue-600" />;
  return <Clock className="h-4 w-4 text-neutral-500" />;
}

export function Timeline({ events = [] }: TimelineProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200/60 bg-neutral-50/50 p-6 text-center text-xs text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900/30">
        No activity logged yet
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
      {events.map((event) => (
        <div key={event.id} className="relative group">
          {/* Node Icon */}
          <div className="absolute -left-6 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-xs dark:border-neutral-700 dark:bg-neutral-900">
            {getActionIcon(event.action || event.title || "UPDATE")}
          </div>

          <div className="rounded-lg border border-neutral-200/80 bg-white p-3.5 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2 dark:border-neutral-800/60">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                  {(event.title || event.action || "UPDATE").replace(/_/g, " ")}
                </span>
                {event.userName && (
                  <span className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                    <User className="h-3 w-3" />
                    {event.userName} {event.userRole ? `(${event.userRole})` : ""}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">
                {event.at || event.timestamp
                  ? formatISTDateTime(event.at || event.timestamp)
                  : ""}
              </span>
            </div>

            {/* Remarks */}
            {event.remarks && (
              <p className="text-xs text-neutral-700 dark:text-neutral-300 italic bg-amber-50/40 dark:bg-amber-950/20 p-2 rounded border border-amber-100 dark:border-amber-900/30">
                &ldquo;{event.remarks}&rdquo;
              </p>
            )}

            {/* Diff / Changes */}
            {event.changes && Object.keys(event.changes).length > 0 && (
              <div className="rounded bg-neutral-50 p-2 dark:bg-neutral-950/40 text-[11px] space-y-1">
                {Object.entries(event.changes).map(([field, { before, after }]) => (
                  <div key={field} className="flex items-center gap-2 font-mono">
                    <span className="text-neutral-500 uppercase">{field}:</span>
                    <span className="text-red-500 line-through">
                      {String(before ?? "—")}
                    </span>
                    <ArrowRight className="h-3 w-3 text-neutral-400" />
                    <span className="text-emerald-600 font-medium">
                      {String(after ?? "—")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Attached Photos */}
            {event.photos && event.photos.length > 0 && (
              <div className="pt-1">
                <PhotoGallery photos={event.photos} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
