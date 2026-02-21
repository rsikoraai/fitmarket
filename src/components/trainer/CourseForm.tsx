"use client";

import { useState, useTransition, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createCourseAction,
  updateCourseAction,
  type CourseActionState,
} from "@/app/dashboard/trainer/courses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES = [
  "Siłownia",
  "Cardio",
  "Żywienie",
  "Pilates",
  "Joga",
  "Boks",
  "Crossfit",
  "Stretching",
  "Triathlon",
  "Inne",
];

// Matches shadcn Input styling
const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

interface CourseFormProps {
  userId: string;
  mode: "create" | "edit";
  initialData?: {
    id: string;
    title: string;
    description: string; // NOT NULL w DB, empty string = brak
    price: number; // grosze
    category: string; // NOT NULL w DB, empty string = brak
    thumbnailUrl: string | null;
    status: "DRAFT" | "PUBLISHED";
  };
}

export function CourseForm({ userId, mode, initialData }: CourseFormProps) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<CourseActionState>({});
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialData?.thumbnailUrl ?? null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Plik jest za duży (max 5 MB)");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("Dozwolone formaty: JPG, PNG, WebP");
      return;
    }

    setUploadError(null);
    setThumbnailFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState({});
    setUploadError(null);

    const formData = new FormData(e.currentTarget);

    if (thumbnailFile) {
      setIsUploading(true);
      const supabase = createClient();
      const ext = thumbnailFile.name.split(".").pop();
      const filePath = `${userId}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("thumbnails")
        .upload(filePath, thumbnailFile, { upsert: true });

      setIsUploading(false);

      if (error) {
        setUploadError(`Błąd przesyłania miniatury: ${error.message}`);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("thumbnails").getPublicUrl(filePath);

      formData.set("thumbnailUrl", publicUrl);
    } else if (initialData?.thumbnailUrl) {
      formData.set("thumbnailUrl", initialData.thumbnailUrl);
    }

    startTransition(async () => {
      if (mode === "create") {
        await createCourseAction({}, formData);
        // createCourseAction redirects on success — never reaches here on success
      } else {
        const result = await updateCourseAction(initialData!.id, {}, formData);
        setState(result);
      }
    });
  };

  const busy = isPending || isUploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Tytuł kursu *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={initialData?.title ?? ""}
          placeholder="Np. Kurs siłowy dla początkujących"
          required
          minLength={3}
          maxLength={200}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Opis</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initialData?.description ?? ""}
          placeholder="Opisz zawartość kursu, dla kogo jest przeznaczony, czego się nauczą..., dla kogo jest przeznaczony, czego się nauczą..."
          rows={4}
          maxLength={5000}
          className="resize-none"
        />
      </div>

      {/* Price + Category */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price">Cena *</Label>
          <div className="relative">
            <Input
              id="price"
              name="price"
              type="number"
              defaultValue={
                initialData ? (initialData.price / 100).toFixed(2) : ""
              }
              placeholder="0.00"
              min="0"
              max="100000"
              step="0.01"
              required
              className="pr-14"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              PLN
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Kategoria</Label>
          <select
            id="category"
            name="category"
            defaultValue={initialData?.category}
            className={selectClass}
          >
            <option value="">Wybierz kategorię</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="status">Status publikacji</Label>
        <select
          id="status"
          name="status"
          defaultValue={initialData?.status ?? "DRAFT"}
          className={selectClass}
        >
          <option value="DRAFT">Szkic — niewidoczny dla klientów</option>
          <option value="PUBLISHED">Opublikowany — dostępny publicznie</option>
        </select>
      </div>

      {/* Thumbnail */}
      <div className="space-y-3">
        <Label>Miniatura kursu</Label>
        <div className="flex items-start gap-4">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Miniatura"
              className="h-24 w-40 shrink-0 rounded-md object-cover border"
            />
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-24 w-40 shrink-0 cursor-pointer items-center justify-center rounded-md border-2 border-dashed text-xs text-muted-foreground hover:border-primary transition-colors text-center p-2"
            >
              Kliknij, aby dodać miniaturę
            </button>
          )}
          <div className="space-y-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? "Zmień miniaturę" : "Dodaj miniaturę"}
            </Button>
            <p className="text-xs text-muted-foreground">
              JPG, PNG lub WebP · max 5 MB
            </p>
            {uploadError && (
              <p className="text-xs text-destructive">{uploadError}</p>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Messages */}
      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          {state.message}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {isUploading
            ? "Przesyłanie miniatury..."
            : isPending
              ? mode === "create"
                ? "Tworzenie kursu..."
                : "Zapisywanie..."
              : mode === "create"
                ? "Utwórz kurs →"
                : "Zapisz zmiany"}
        </Button>
      </div>
    </form>
  );
}
