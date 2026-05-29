"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { PatientFileActivityList } from "@/components/patient-files/activity-drawer";
import { PatientFilesWorkspace } from "@/components/patient-files/patient-files-workspace";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  PatientDetailPatient,
  PatientFileActivityRow,
  PatientFileRow,
  PatientFolderRow,
} from "@/lib/patient-files/types";
import { formatPatientDisplayName } from "@/lib/patient-files/utils";

type PatientDetailShellProps = {
  patient: PatientDetailPatient;
  folders: PatientFolderRow[];
  files: PatientFileRow[];
  activities: PatientFileActivityRow[];
  performerNames: Record<string, string>;
};

function formatDateOnly(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
}

export function PatientDetailShell({
  patient,
  folders,
  files,
  activities,
  performerNames,
}: PatientDetailShellProps) {
  const displayName = formatPatientDisplayName(patient);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-3">
        <Link
          href="/patients"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to patients
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
          <div className="flex flex-wrap gap-2">
            {patient.branch_short_names.map((branch) => (
              <Badge key={branch} variant="outline">
                {branch}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="files" className="min-h-0 flex-1">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient details</CardTitle>
              <CardDescription>Basic profile information.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Contact</p>
                <p className="font-medium">{patient.contact_number ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date of birth</p>
                <p className="font-medium">
                  {formatDateOnly(patient.date_of_birth)}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{patient.address ?? "—"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <PatientFilesWorkspace
            patientId={patient.id}
            folders={folders}
            files={files}
            activities={activities}
            performerNames={performerNames}
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity history</CardTitle>
              <CardDescription>
                File and folder actions for this patient.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PatientFileActivityList
                activities={activities}
                performerNames={performerNames}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
