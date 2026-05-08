"use client";

import { signOutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button onClick={() => void signOutAction()}>Logout</Button>
  );
}
