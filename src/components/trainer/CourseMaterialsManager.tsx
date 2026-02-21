"use client";

import { useState, useTransition, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  addMaterialAction,
  deleteMaterialAction,
  type MaterialActionState,
} from "@/app/dashboard/trainer/courses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

interface Material {
  id: string;
  title: string;
  type: "VIDEO" | "PDF";
  position: number;
  fileUrl: string;
}

interface Props {
  courseId: string;
  userId: string;
  materials: Material[];
}

const MAX_SIZE = {
  VIDEO: 500 * 1024 * 1024, // 500 MB
  PDF: 50 * 1024 * 1024, // 50 MB
};
const MAX_SIZE_LABEL = { VIDEO: "500 MB", PDF: "50 MB" };
const FILE_ACCEPT = {
  VIDEO: "video/mp4,video/webm,video/quicktime",
  PDF: "application/pdf",
};

export function CourseMaterialsManager({ courseId, userId, materials }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [addState, setAddState] = useState<MaterialActionState>({});
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialType, setMaterialType] = useState<"VIDEO" | "PDF">("VIDEO");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setShowAddForm(false);
    setMaterialFile(null);
    setAddState({});
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMaterialType(e.target.value as "VIDEO" | "PDF");
    setMaterialFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE[materialType]) {
      setUploadError(`Plik jest za duży (max ${MAX_SIZE_LABEL[materialType]})`);
      return;
    }
    setUploadError(null);
    setMaterialFile(file);
  };

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddState({});
    setUploadError(null);

    if (!materialFile) {
      setUploadError("Wybierz plik");
      return;
    }

    const formData = new FormData(e.currentTarget);

    // Upload to private bucket — store path (not public URL)
    setIsUploading(true);
    const supabase = createClient();
    const ext = materialFile.name.split(".").pop();
    const filePath = `${userId}/${courseId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("course-materials")
      .upload(filePath, materialFile, { upsert: false });

    setIsUploading(false);

    if (error) {
      setUploadError(`Błąd przesyłania: ${error.message}`);
      return;
    }

    formData.set("fileUrl", filePath); // store path for signed URL generation later

    startTransition(async () => {
      const result = await addMaterialAction(courseId, {}, formData);
      setAddState(result);
      if (!result.error) resetForm();
    });
  };

  const busy = isPending || isUploading;

  return (
    <div className="space-y-3">
      {/* Materials list */}
      {materials.length > 0 && (
        <div className="space-y-2">
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex items-center gap-3 rounded-md border px-3 py-2.5"
            >
              <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">
                {material.position}.
              </span>
              <Badge
                variant={material.type === "VIDEO" ? "default" : "secondary"}
                className="shrink-0 text-xs"
              >
                {material.type === "VIDEO" ? "Wideo" : "PDF"}
              </Badge>
              <span className="flex-1 truncate text-sm font-medium">
                {material.title}
              </span>
              <form
                action={deleteMaterialAction.bind(null, courseId, material.id)}
              >
                <button
                  type="submit"
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Usuń
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {materials.length === 0 && !showAddForm && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Brak materiałów. Dodaj filmy lub PDF-y do swojego kursu.
        </p>
      )}

      {/* Add form */}
      {showAddForm ? (
        <form
          onSubmit={handleAddSubmit}
          className="space-y-4 rounded-md border p-4"
        >
          <p className="text-sm font-medium">Nowy materiał</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mat-type">Typ</Label>
              <select
                id="mat-type"
                name="type"
                value={materialType}
                onChange={handleTypeChange}
                className={selectClass}
              >
                <option value="VIDEO">Wideo</option>
                <option value="PDF">PDF</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mat-title">Tytuł *</Label>
              <Input
                id="mat-title"
                name="title"
                placeholder="Np. Lekcja 1 — Wprowadzenie"
                required
                minLength={1}
                maxLength={200}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mat-file">
              Plik{" "}
              <span className="font-normal text-muted-foreground">
                ({materialType === "VIDEO" ? "MP4/WebM/MOV" : "PDF"} · max{" "}
                {MAX_SIZE_LABEL[materialType]})
              </span>
            </Label>
            <input
              ref={fileInputRef}
              id="mat-file"
              type="file"
              accept={FILE_ACCEPT[materialType]}
              onChange={handleFileChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {materialFile && (
              <p className="text-xs text-muted-foreground">
                {materialFile.name} (
                {(materialFile.size / 1024 / 1024).toFixed(1)} MB)
              </p>
            )}
            {uploadError && (
              <p className="text-xs text-destructive">{uploadError}</p>
            )}
          </div>

          {addState.error && (
            <p className="text-sm text-destructive">{addState.error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetForm}
            >
              Anuluj
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {isUploading
                ? "Przesyłanie..."
                : isPending
                  ? "Dodawanie..."
                  : "Dodaj materiał"}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setShowAddForm(true)}
        >
          + Dodaj materiał
        </Button>
      )}
    </div>
  );
}
