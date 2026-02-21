/**
 * Skrypt jednorazowy: tworzy buckety w Supabase Storage.
 * Uruchom: npx tsx scripts/setup-storage.ts
 * Wymaga: SUPABASE_SERVICE_ROLE_KEY w .env.local
 *
 * Polityki RLS do ustawienia ręcznie w Supabase Dashboard:
 *
 * BUCKET: avatars (public)
 *   INSERT authenticated: (storage.foldername(name))[1] = auth.uid()::text
 *   SELECT public: true
 *
 * BUCKET: thumbnails (public)
 *   INSERT authenticated: (storage.foldername(name))[1] = auth.uid()::text
 *   SELECT public: true
 *
 * BUCKET: course-materials (private)
 *   INSERT authenticated: (storage.foldername(name))[1] = auth.uid()::text
 *   SELECT authenticated: (storage.foldername(name))[1] = auth.uid()::text
 *   (klienci z zakupem: dodać w Krok 5)
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Brak zmiennych środowiskowych: NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const BUCKETS = [
  {
    name: "avatars",
    public: true,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    fileSizeLimit: 5 * 1024 * 1024, // 5 MB
  },
  {
    name: "thumbnails",
    public: true,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    fileSizeLimit: 5 * 1024 * 1024, // 5 MB
  },
  {
    name: "course-materials",
    public: false,
    allowedMimeTypes: [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "application/pdf",
    ],
    fileSizeLimit: 50 * 1024 * 1024, // 50 MB (limit planu Free)
  },
];

async function setupStorage() {
  const supabase = createClient(supabaseUrl!, serviceRoleKey!);

  for (const bucket of BUCKETS) {
    console.log(`Tworzenie bucketu '${bucket.name}'...`);

    const { error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
      allowedMimeTypes: bucket.allowedMimeTypes,
      fileSizeLimit: bucket.fileSizeLimit,
    });

    if (error) {
      if (error.message.includes("already exists")) {
        console.log(`  ✓ Bucket '${bucket.name}' już istnieje`);
      } else {
        console.error(`  ✗ Błąd tworzenia '${bucket.name}':`, error.message);
        process.exit(1);
      }
    } else {
      console.log(`  ✓ Bucket '${bucket.name}' utworzony`);
    }
  }

  console.log("\nDone! Pamiętaj o ustawieniu polityk RLS — patrz komentarz w tym pliku.");
}

setupStorage();
