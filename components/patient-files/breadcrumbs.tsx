"use client";

import {
  ChevronRightIcon,
  FolderIcon,
  HomeIcon,
} from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { PatientFolderRow } from "@/lib/patient-files/types";
import { buildBreadcrumb } from "@/lib/patient-files/utils";

type PatientFolderBreadcrumbsProps = {
  folders: PatientFolderRow[];
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
};

export function PatientFolderBreadcrumbs({
  folders,
  currentFolderId,
  onNavigate,
}: PatientFolderBreadcrumbsProps) {
  const trail = buildBreadcrumb(currentFolderId, folders);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1"
              onClick={() => onNavigate(null)}
            >
              <HomeIcon className="size-3.5" />
              Files
            </button>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {trail.map((folder, index) => {
          const isLast = index === trail.length - 1;
          return (
            <span key={folder.id} className="contents">
              <BreadcrumbSeparator>
                <ChevronRightIcon />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="inline-flex items-center gap-1">
                    <FolderIcon className="size-3.5" />
                    {folder.name}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => onNavigate(folder.id)}
                    >
                      <FolderIcon className="size-3.5" />
                      {folder.name}
                    </button>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
