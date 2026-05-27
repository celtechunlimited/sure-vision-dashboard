"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  renamePatientFile,
  renamePatientFolder,
} from "@/lib/actions/patient-file-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RenameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "folder" | "file";
  targetId: string;
  currentName: string;
};

export function RenameDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  currentName,
}: RenameDialogProps) {
  const router = useRouter();
  const [name, setName] = React.useState(currentName);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result =
        targetType === "folder"
          ? await renamePatientFolder({ folderId: targetId, name })
          : await renamePatientFile({ fileId: targetId, fileName: name });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Renamed");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename {targetType}</DialogTitle>
            <DialogDescription>Enter a new name.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rename-name">Name</Label>
              <Input
                id="rename-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
