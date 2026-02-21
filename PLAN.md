# PLAN.md — FitMarket

## Stack technologiczny

| Warstwa | Narzędzie | Wersja |
|---|---|---|
| Framework | Next.js (App Router) | 15.x |
| Język | TypeScript | 5.x |
| Baza danych | Supabase (PostgreSQL) | - |
| Auth | Supabase Auth | - |
| Storage (pliki) | Supabase Storage | - |
| ORM | Prisma | 6.x |
| Płatności | Stripe (+ BLIK) | - |
| Styling | Tailwind CSS 4 + shadcn/ui | - |
| Email | Resend | - |
| Walidacja | Zod | - |
| Deployment | Vercel | - |

---

## Schemat bazy danych

```
users
├── id (uuid, PK)
├── email (text, unique)
├── role (enum: TRAINER / CLIENT)
├── created_at (timestamp)
└── updated_at (timestamp)

trainer_profiles
├── id (uuid, PK)
├── user_id (uuid, FK → users.id, unique)
├── display_name (text)
├── bio (text, nullable)
├── avatar_url (text, nullable)
├── specializations (text[], tablica stringów)
├── created_at (timestamp)
└── updated_at (timestamp)

courses
├── id (uuid, PK)
├── trainer_id (uuid, FK → trainer_profiles.id)
├── title (text)
├── description (text)
├── price (integer, w groszach — 4999 = 49.99 PLN)
├── category (text)
├── thumbnail_url (text, nullable)
├── status (enum: DRAFT / PUBLISHED)
├── created_at (timestamp)
└── updated_at (timestamp)

course_materials
├── id (uuid, PK)
├── course_id (uuid, FK → courses.id)
├── type (enum: VIDEO / PDF)
├── title (text)
├── file_url (text)
├── position (integer, kolejność wyświetlania)
├── created_at (timestamp)
└── updated_at (timestamp)

cart_items
├── id (uuid, PK)
├── client_id (uuid, FK → users.id)
├── course_id (uuid, FK → courses.id)
├── created_at (timestamp)
└── UNIQUE(client_id, course_id)

purchases
├── id (uuid, PK)
├── client_id (uuid, FK → users.id)
├── course_id (uuid, FK → courses.id)
├── stripe_payment_id (text)
├── amount (integer, w groszach)
├── status (enum: PENDING / COMPLETED / FAILED)
├── created_at (timestamp)
└── updated_at (timestamp)
```

**Kluczowe relacje:**
- User 1:1 TrainerProfile (tylko rola TRAINER)
- TrainerProfile 1:N Courses
- Course 1:N CourseMaterials
- User (CLIENT) N:M CartItems (koszyk)
- User (CLIENT) N:M Courses przez Purchases

**Logika koszyka (dual storage):**
- Niezalogowany → koszyk w localStorage (tablica course_id)
- Zalogowany → koszyk w tabeli cart_items
- Po zalogowaniu/rejestracji → automatyczny merge localStorage → baza (bez duplikatów)
- Przy płatności → jeśli niezalogowany, najpierw ekran "Zaloguj się / Zarejestruj się"

---

## Struktura plików

```
fitmarket/
├── .env.local                    # zmienne środowiskowe (lokalne)
├── .env.example                  # szablon zmiennych (do repo)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── prisma/
│   └── schema.prisma             # schemat bazy danych
├── public/
│   └── placeholder-course.png    # placeholder dla kursów bez miniaturki
├── src/
│   ├── app/
│   │   ├── layout.tsx            # root layout (fonty, metadata)
│   │   ├── page.tsx              # strona główna (lista kursów)
│   │   ├── globals.css           # Tailwind imports
│   │   │
│   │   ├── (auth)/               # grupa: strony auth
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── callback/route.ts # Supabase auth callback
│   │   │
│   │   ├── dashboard/
│   │   │   ├── page.tsx          # router: trener → panel trenera, klient → moje kursy
│   │   │   ├── trainer/
│   │   │   │   ├── page.tsx      # panel trenera: lista jego kursów + statystyki
│   │   │   │   ├── profile/page.tsx    # edycja profilu trenera
│   │   │   │   └── courses/
│   │   │   │       ├── new/page.tsx    # formularz tworzenia kursu
│   │   │   │       └── [id]/edit/page.tsx  # edycja kursu
│   │   │   └── client/
│   │   │       └── page.tsx      # moje kursy (kupione)
│   │   │
│   │   ├── courses/
│   │   │   └── [id]/page.tsx     # publiczna strona kursu
│   │   │
│   │   ├── cart/
│   │   │   └── page.tsx          # strona koszyka (lista kursów, suma, przycisk "Zapłać")
│   │   │
│   │   ├── trainers/
│   │   │   └── [id]/page.tsx     # publiczny profil trenera
│   │   │
│   │   └── api/
│   │       ├── cart/
│   │       │   ├── route.ts          # GET (pobierz koszyk), POST (dodaj), DELETE (usuń)
│   │       │   └── merge/route.ts    # POST: merge localStorage → baza po logowaniu
│   │       ├── stripe/
│   │       │   ├── checkout/route.ts   # tworzenie Stripe Checkout Session (wiele kursów)
│   │       │   └── webhook/route.ts    # Stripe webhook (potwierdzenie płatności)
│   │       └── courses/
│   │           └── materials/[id]/route.ts  # signed URL dla plików (zabezpieczony dostęp)
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn/ui (Button, Input, Card, etc.)
│   │   ├── layout/
│   │   │   ├── Navbar.tsx        # zawiera ikonę koszyka z licznikiem
│   │   │   └── Footer.tsx
│   │   ├── courses/
│   │   │   ├── CourseCard.tsx     # karta kursu (lista)
│   │   │   ├── CourseForm.tsx     # formularz tworzenia/edycji
│   │   │   ├── CourseFilters.tsx  # filtry + wyszukiwarka
│   │   │   └── MaterialsList.tsx # lista materiałów (wideo + PDF)
│   │   ├── cart/
│   │   │   ├── CartItem.tsx      # pojedynczy kurs w koszyku
│   │   │   ├── CartSummary.tsx   # podsumowanie (suma, przycisk "Zapłać")
│   │   │   └── AddToCartButton.tsx  # przycisk "Dodaj do koszyka" (na stronie kursu)
│   │   └── auth/
│   │       ├── LoginForm.tsx
│   │       └── RegisterForm.tsx
│   │
│   ├── hooks/
│   │   └── useCart.ts            # hook: logika koszyka (localStorage + API, merge)
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # Supabase client (browser)
│   │   │   ├── server.ts         # Supabase client (server components)
│   │   │   └── middleware.ts     # session refresh
│   │   ├── stripe.ts             # Stripe client + helpery
│   │   ├── prisma.ts             # Prisma client singleton
│   │   └── utils.ts              # formatowanie cen, helpery
│   │
│   ├── types/
│   │   └── index.ts              # TypeScript types i Zod schemas
│   │
│   └── middleware.ts             # Next.js middleware (auth redirect)
```

---

## Kroki implementacji

### Krok 1: Setup projektu
- Inicjalizacja Next.js 15 + TypeScript
- Instalacja zależności (Tailwind, Prisma, shadcn/ui, Zod)
- Konfiguracja Tailwind + shadcn/ui
- Utworzenie konta Supabase + konfiguracja .env
- Konfiguracja Prisma ze schematem bazy danych
- Pierwszy push do GitHub

**Checkpoint:** Projekt uruchamia się lokalnie (`npm run dev`), Prisma łączy się z Supabase.

---

### Krok 2: Auth (F1 — Rejestracja i logowanie)
- Konfiguracja Supabase Auth
- Formularze: rejestracja (z wyborem roli) + logowanie
- Middleware Next.js: ochrona tras dashboard
- Callback route dla Supabase Auth
- Redirect po logowaniu: trener → /dashboard/trainer, klient → /dashboard/client

**Checkpoint:** Rejestruję się jako trener i jako klient. Zalogowany trener widzi panel trenera. Zalogowany klient widzi panel klienta. Niezalogowany → redirect na /login.

---

### Krok 3: Profil trenera (F2)
- Konfiguracja Supabase Storage (bucket: avatars)
- Strona edycji profilu trenera (/dashboard/trainer/profile)
- Upload zdjęcia profilowego
- Publiczna strona profilu trenera (/trainers/[id])

**Checkpoint:** Trener wypełnia bio, uploaduje zdjęcie, zapisuje. Profil widoczny publicznie pod /trainers/[id].

---

### Krok 4: Dodawanie kursu (F3)
- Konfiguracja Supabase Storage (buckety: thumbnails, course-materials)
- Formularz tworzenia kursu z uploadem plików
- Status draft/published
- Lista kursów trenera w dashboardzie
- Edycja kursu

**Checkpoint:** Trener tworzy kurs, dodaje wideo + PDF, publikuje. Kurs widoczny w panelu trenera.

---

### Krok 5: Strona główna + wyszukiwarka (F4)
- Lista opublikowanych kursów na stronie głównej
- Komponent CourseCard (miniaturka, tytuł, cena, trener)
- Wyszukiwanie po nazwie
- Filtrowanie po kategorii
- Sortowanie: najnowsze / najtańsze / najpopularniejsze
- Navbar z nawigacją

**Checkpoint:** Strona główna pokazuje kursy. Wyszukuję "trening nóg" — znajduje. Filtruję po kategorii — działa.

---

### Krok 6: Strona kursu (F5)
- Podstrona /courses/[id] z pełnym opisem
- Info o trenerze (link do profilu)
- Przycisk "Dodaj do koszyka" (dla każdego — działa bez logowania)
- Przycisk "Kup teraz" (skrót: dodaje do koszyka i od razu przechodzi do /cart)
- "Edytuj" (widoczny tylko dla trenera-właściciela)
- Responsywny layout

**Checkpoint:** Klikam kurs na liście → otwieram stronę z opisem, ceną, trenerem. Klikam "Dodaj do koszyka" bez logowania → kurs dodany.

---

### Krok 7: Koszyk (NOWY)
- Hook useCart: dual storage (localStorage dla niezalogowanych, API/baza dla zalogowanych)
- Strona /cart: lista kursów, cena każdego, suma, przycisk "Zapłać"
- Usuwanie kursów z koszyka
- Ikona koszyka w Navbarze z licznikiem pozycji
- Zabezpieczenia: nie można dodać kursu który już kupiłeś, nie można dodać tego samego kursu dwa razy
- API routes: GET/POST/DELETE dla koszyka
- Merge endpoint: po logowaniu/rejestracji → localStorage przenosi się do bazy
- Przy kliknięciu "Zapłać" bez logowania → ekran: "Mam konto → Zaloguj się" / "Nie mam konta → Zarejestruj się"

**Checkpoint:** Dodaję 3 kursy do koszyka bez logowania. Widzę je na /cart z sumą. Loguję się → kursy nadal w koszyku (merge zadziałał). Klikam "Zapłać" → przechodzę do płatności.

---

### Krok 8: Płatności Stripe (F6)
- Utworzenie konta Stripe + konfiguracja kluczy API
- Endpoint API: tworzenie Checkout Session z wieloma line_items (z koszyka) + BLIK jako payment method
- Stripe webhook: obsługa payment_intent.succeeded / checkout.session.completed
- Zapis wielu purchases w bazie po udanej płatności
- Wyczyszczenie koszyka po udanej płatności
- Strona sukcesu / porażki po płatności

**Checkpoint:** Mam 2 kursy w koszyku → klikam "Zapłać" → Stripe Checkout (widzę BLIK + kartę, 2 pozycje) → płacę testowo → 2 zamówienia w bazie → koszyk pusty → redirect na stronę sukcesu.

---

### Krok 9: Dostęp do materiałów (F7)
- Sekcja "Moje kursy" w dashboardzie klienta
- Lista kupionych kursów
- Strona materiałów kursu (wideo player + PDF download)
- Zabezpieczenie: signed URLs z Supabase Storage (brak dostępu bez zakupu)

**Checkpoint:** Kupuję kurs → widzę go w "Moje kursy" → oglądam wideo, pobieram PDF. Bez zakupu → brak dostępu do materiałów.

---

### Krok 10: Polish + responsywność
- Mobile-first przegląd wszystkich stron
- Meta tagi + semantic HTML (SEO)
- Podstawowa dostępność (kontrast, alt-texty)
- Loading states i obsługa błędów
- Footer

**Checkpoint:** Aplikacja wygląda dobrze na telefonie. Lighthouse: Performance > 80, SEO > 90.

---

### Krok 11: Deploy na Vercel
- Konfiguracja zmiennych środowiskowych na Vercel
- Deploy produkcyjny
- Test end-to-end na produkcji
- Konfiguracja Stripe webhook dla produkcyjnego URL

**Checkpoint:** Aplikacja działa pod publicznym URL. Cały flow (rejestracja → zakup → dostęp) działa na produkcji.

---

## Zmienne środowiskowe (.env.example)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Prisma
DATABASE_URL=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
