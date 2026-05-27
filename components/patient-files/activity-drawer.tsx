"use client";

import * as React from "react";
import {
  DownloadIcon,
  FileIcon,
  FolderIcon,
  HistoryIcon,
  PencilIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { PatientFileActivityRow } from "@/lib/patient-files/types";
import { formatDateTime } from "@/lib/patient-files/utils";

type ActivityDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: PatientFileActivityRow[];
  performerNames: Record<string, string>;
};

function actionLabel(action: PatientFileActivityRow["action_type"]): string {
  return action
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function ActionIcon({ action }: { action: PatientFileActivityRow["action_type"] }) {
  if (action.startsWith("FOLDER")) return <FolderIcon className="size-4" />;
  if (action.includes("DELETE")) return <Trash2Icon className="size-4" />;
  if (action.includes("DOWNLOAD")) return <DownloadIcon className="size-4" />;
  if (action.includes("UPLOAD") || action.includes("REPLACE")) {
    return <UploadIcon className="size-4" />;
  }
  if (action.includes("RENAME")) return <PencilIcon className="size-4" />;
  return <FileIcon className="size-4" />;
}

export function ActivityDrawer({
  open,
  onOpenChange,
  activities,
  performerNames,
}: ActivityDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HistoryIcon className="size-4" />
            Activity history
          </SheetTitle>
          <SheetDescription>
            Recent file and folder actions for this patient.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4 overflow-y-auto pr-1">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex gap-3 rounded-lg border p-3">
                <div className="mt-0.5 text-muted-foreground">
                  <ActionIcon action={activity.action_type} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium">
                    {actionLabel(activity.action_type)}
                  </p>
                  {activity.metadata.target_name ? (
                    <p className="truncate text-sm text-muted-foreground">
                      {activity.metadata.target_name}
                    </p>
                  ) : null}
                  {activity.metadata.previous_value ||
                  activity.metadata.new_value ? (
                    <p className="text-xs text-muted-foreground">
                      {activity.metadata.previous_value ?? "—"} →{" "}
                      {activity.metadata.new_value ?? "—"}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {performerNames[activity.performed_by] ?? "Staff"} ·{" "}
                    {formatDateTime(activity.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

type PatientFileActivityListProps = {
  activities: PatientFileActivityRow[];
  performerNames: Record<string, string>;
};

export function PatientFileActivityList({
  activities,
  performerNames,
}: PatientFileActivityListProps) {
  return (
    <div className="space-y-4">
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        activities.map((activity) => (
          <div key={activity.id} className="flex gap-3 rounded-lg border p-4">
            <div className="mt-0.5 text-muted-foreground">
              <ActionIcon action={activity.action_type} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-medium">{actionLabel(activity.action_type)}</p>
              {activity.metadata.target_name ? (
                <p className="text-sm text-muted-foreground">
                  {activity.metadata.target_name}
                </p>
              ) : null}
              {activity.metadata.previous_value ||
              activity.metadata.new_value ? (
                <p className="text-xs text-muted-foreground">
                  {activity.metadata.previous_value ?? "—"} →{" "}
                  {activity.metadata.new_value ?? "—"}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {performerNames[activity.performed_by] ?? "Staff"} ·{" "}
                {formatDateTime(activity.created_at)}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
