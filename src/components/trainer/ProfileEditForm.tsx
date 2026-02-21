"use client";

import { useState, useTransition, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  updateProfileAction,
  type ProfileActionState,
} from "@/app/dashboard/trainer/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Props {
  userId: string;
  initialData: {
    displayName: string;
    bio: string | null;
    specializations: string[];
    avatarUrl: string | null;
  };
}

export function ProfileEditForm({ userId, initialData }: Props) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ProfileActionState>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialData.avatarUrl
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
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

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Dozwolone formaty: JPG, PNG, WebP");
      return;
    }

    setUploadError(null);
    setAvatarFile(file);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState({});
    setUploadError(null);

    const formData = new FormData(e.currentTarget);

    // Upload nowego avatara jeśli wybrany
    if (avatarFile) {
      setIsUploading(true);
      const supabase = createClient();
      const ext = avatarFile.name.split(".").pop();
      const filePath = `${userId}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });

      setIsUploading(false);

      if (error) {
        setUploadError(`Błąd przesyłania zdjęcia: ${error.message}`);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      formData.set("avatarUrl", publicUrl);
    } else if (initialData.avatarUrl) {
      formData.set("avatarUrl", initialData.avatarUrl);
    }

    startTransition(async () => {
      const result = await updateProfileAction({}, formData);
      setState(result);
    });
  };

  const busy = isPending || isUploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar */}
      <div className="space-y-3">
        <Label>Zdjęcie profilowe</Label>
        <div className="flex items-center gap-4">
          <div
            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-muted cursor-pointer border-2 border-dashed border-border hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-xs text-muted-foreground text-center px-2">
                  Kliknij, aby dodać zdjęcie
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? "Zmień zdjęcie" : "Dodaj zdjęcie"}
            </Button>
            <p className="text-xs text-muted-foreground">
              JPG, PNG lub WebP · max 5 MB
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploadError && (
          <p className="text-sm text-destructive">{uploadError}</p>
        )}
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="displayName">Imię / pseudonim *</Label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={initialData.displayName}
          placeholder="Np. Jan Kowalski — Personal Trainer"
          required
          minLength={2}
          maxLength={100}
        />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={initialData.bio ?? ""}
          placeholder="Napisz kilka słów o sobie, swojej filozofii treningu, doświadczeniu..."
          rows={5}
          maxLength={1000}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">Maksymalnie 1000 znaków</p>
      </div>

      {/* Specializations */}
      <div className="space-y-2">
        <Label htmlFor="specializations">
          Specjalizacje
          <span className="ml-1 font-normal text-muted-foreground">
            (oddzielone przecinkami)
          </span>
        </Label>
        <Input
          id="specializations"
          name="specializations"
          defaultValue={initialData.specializations.join(", ")}
          placeholder="Np. Siłownia, Żywienie, Triathlon, Pilates"
        />
        {initialData.specializations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {initialData.specializations.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Status messages */}
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

      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {isUploading
          ? "Przesyłanie zdjęcia..."
          : isPending
            ? "Zapisywanie..."
            : "Zapisz profil"}
      </Button>
    </form>
  );
}
