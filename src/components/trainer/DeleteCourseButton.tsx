"use client";

import { useState } from "react";
import { deleteCourseAction } from "@/app/dashboard/trainer/courses/actions";
import { Button } from "@/components/ui/button";

export function DeleteCourseButton({ courseId }: { courseId: string }) {
  const [confirming, setConfirming] = useState(false);
  const boundAction = deleteCourseAction.bind(null, courseId);

  if (!confirming) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive border-destructive/30"
        onClick={() => setConfirming(true)}
      >
        Usuń kurs
      </Button>
    );
  }

  return (
    <form action={boundAction} className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Na pewno?</span>
      <Button type="submit" variant="destructive" size="sm">
        Tak, usuń
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        Anuluj
      </Button>
    </form>
  );
}
