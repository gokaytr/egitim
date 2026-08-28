# Odak — Sınav Hazırlık Platformu

1. sınıftan 12. sınıfa kadar LGS / TYT / AYT / YKS / KPSS / ALES hazırlığı için geliştirilen; admin, öğretmen, öğrenci ve veli rolleriyle çalışan, yapay zekâ destekli eksik konu tespiti ve özel derse yönlendirme yapan bir eğitim platformu.

Bu doküman, projeye yeni katılacak ya da koda uzun aradan sonra dönecek bir geliştiricinin projeyi hızlıca kavraması için yazılmıştır.

## Proje hangi dilde / hangi teknolojilerle yazıldı

Proje uçtan uca **TypeScript** ile yazılmıştır (hem sunucu tarafı hem istemci tarafı, aynı dil). Kullanılan ana teknolojiler:

- **Next.js (App Router)** — hem arayüz hem sunucu tarafı (API route'ları, server component'ler, middleware) tek bir Next.js projesinde birleşiyor. Sayfalar `src/app` altında dosya tabanlı yönlendirme ile tanımlı.
- **React** — arayüz katmanı. Çoğu sayfa "server component" olarak yazılmış (veriyi doğrudan sunucuda Supabase'den çekip render ediyor); yalnızca etkileşim gereken yerlerde (formlar, sohbet kutusu, grafikler vb.) `"use client"` component'leri kullanılıyor.
- **TypeScript strict mod** açık — tip güvenliği ciddiye alınıyor, `any` kullanmaktan kaçınılıyor.
- **Tailwind CSS** — tüm stil, utility class'larla `className` üzerinden yazılıyor; ayrı CSS dosyaları neredeyse yok.
- **Supabase** — veritabanı (Postgres), kimlik doğrulama (Auth) ve yetkilendirme (Row Level Security politikaları) burada. Sunucu tarafında `@/lib/supabase/server`, istemci tarafında `@/lib/supabase/client` üzerinden erişiliyor.
- **Anthropic Claude API** — soru üretimi ve öğrenci eksik analizi gibi yapay zekâ özellikleri bu API üzerinden çalışıyor (`src/lib/ai/anthropic.ts`).
- **Zod** — form ve API girdilerinin doğrulanması için.
- **mammoth** ve **pdf-parse** — öğretmenlerin yüklediği .docx / .pdf dosyalarından soru metni çıkarmak için.
- **Vercel** — projenin canlıya alındığı (deploy edildiği) platform; GitHub'daki `main` dalına yapılan her push sonrası otomatik olarak yeniden deploy oluyor.

Özetle: klasik bir "backend + frontend" ayrımı yok, Next.js'in App Router yapısı sayesinde ikisi de aynı TypeScript kod tabanında yaşıyor. Veritabanı, kimlik doğrulama ve yetkilendirme tamamen Supabase'e devredilmiş durumda.

## Klasör yapısı

```
src/
  app/               → Sayfalar ve API route'ları (Next.js App Router)
    admin/           → Admin paneli sayfaları
    ogretmen/        → Öğretmen paneli sayfaları
    ogrenci/         → Öğrenci paneli sayfaları
    api/             → Sunucu tarafı API uç noktaları (route.ts dosyaları)
    giris/, kayit/   → Giriş ve kayıt sayfaları
    basvuru-bekleniyor/ → Onay bekleyen öğretmen başvurusu ekranı
    layout.tsx, page.tsx, globals.css → Kök düzen ve ana sayfa

  components/        → Sayfalar arasında paylaşılan React component'leri
                        (grafikler, sohbet kutusu, form bileşenleri, rol bazlı
                        gezinme menüsü vb.)

  hooks/             → Paylaşılan React hook'ları

  lib/               → İş mantığı, yardımcı fonksiyonlar (component olmayan her şey)
    supabase/        → Supabase client/server bağlantı kurulumu
    ai/              → Anthropic Claude API entegrasyonu
    diagnosis/       → Kural tabanlı eksik konu tespiti
    reports/         → Rapor verisi hazırlayan fonksiyonlar (öğrenci raporu,
                        öğretmen aktivite raporu, genel özet, aktivite akışı)
    teacher/         → Öğretmen bağlamı çözümleme yardımcıları (admin önizlemesi dahil)
    coach/           → Koç Pusula'nın hazır cevap motoru
    questions/       → Toplu soru içe aktarma / ayrıştırma
    docs/            → "Nasıl çalışır" sayfalarının statik içerikleri
    site-settings.ts → Genel site ayarları (demo veri aç/kapa gibi)

  middleware.ts      → Rota koruması: giriş yapmamış ya da rolü uymayan
                        kullanıcıyı ilgili sayfadan uzaklaştırır

  types/             → Paylaşılan TypeScript tipleri

supabase/
  migrations/        → Veritabanı şemasının sırayla uygulanan SQL dosyaları
                        (tablolar, roller, RLS politikaları, sonradan eklenen
                        her özellik ayrı bir migration dosyasıdır)
```

## Roller ve temel özellikler

- **Admin** (`/admin`): Kullanıcı yönetimi, öğretmen başvurularını onaylama, müfredat genel görünümü, tüm soruların onayı, veli-öğrenci bağlantıları, öğrenci raporları, öğretmen aktivite raporu (hangi öğretmen ne kadar katkı yapmış), genel site ayarları (demo veriyi göster/gizle).
- **Öğretmen** (`/ogretmen`): Konu anlatımı ekleme, elle soru ekleme, yapay zekâ ile soru taslağı ürettirme, kendisine atanan öğrencilerin raporlarını görme, özel ders taleplerini yönetme. Soru onayı yalnızca kendi branşındaki konularla sınırlı.
- **Öğrenci** (`/ogrenci`): Konu seçip "biliyorum / bilmiyorum" ile teste girme ya da çalışma programına ekleme, test sonucunda otomatik yapay zekâ eksik analizi, ilerleme raporu (grafiklerle), Koç Pusula adlı motivasyon sohbet kutusu.
- **Veli**: `parent_student_links` tablosu üzerinden bir öğrenciye bağlanır, öğrencinin ilerleme raporunu görür.

### Öne çıkan özellikler
- **Demo veri aç/kapa**: `profiles.is_demo` ve `site_settings.show_demo_data` ile, canlıya geçerken demo kullanıcı/soru/veriler tek düğmeyle raporlardan ve listelerden gizlenebiliyor.
- **Koç Pusula**: Öğrenciye özel, sabit/hazır cevaplardan oluşan (gerçek zamanlı yapay zekâ çağrısı yapmayan) motivasyon sohbet kutusu; öğrencinin son çalışmalarına göre bağlam kurup teşvik edici mesajlar veriyor, kriz ifadelerinde güvenli yönlendirme yapıyor.
- **Branşa göre soru onayı**: Öğretmenler yalnızca kendi branşlarındaki soruları onaylıyor, `teacher_subjects` tablosu üzerinden.
- **El yapımı SVG grafikler**: Öğrenci raporlarındaki grafikler harici bir kütüphane olmadan, `src/components/report-charts.tsx` içinde doğrudan SVG olarak çiziliyor.

## Geliştirme ortamını kurma

### 1. Bağımlılıklar
`npm install`

### 2. Supabase projesi
1. https://supabase.com üzerinde bir proje oluşturun.
2. Proje Ayarları → API sayfasından Project URL, anon public key ve service_role key değerlerini alın.
3. SQL Editor'de `supabase/migrations/` klasöründeki dosyaları **numara sırasına göre** (0001'den başlayarak) çalıştırın. Şu an 15 migration dosyası var; her biri şemaya küçük bir ekleme yapıyor (roller, RLS politikaları, öğretmen-öğrenci atamaları, veli özellikleri, site ayarları vb.).
4. İlk admin kullanıcıyı oluşturmak için: Authentication → Users'dan bir kullanıcı ekleyin, sonra `profiles` tablosuna admin rolüyle bir kayıt girin.

### 3. Ortam değişkenleri
`.env.example` dosyasını `.env.local` olarak kopyalayıp değerleri doldurun. Gereken değişkenler: Supabase URL, Supabase anon key, Supabase service role key (yalnızca sunucu tarafında kullanılır, asla repoya girmemeli) ve Anthropic API anahtarı (yapay zekâ özellikleri için).

### 4. Geliştirme sunucusu
`npm run dev`

### 5. Tip kontrolü
Değişiklik yapıldıktan sonra `npx tsc --noEmit` ile tip hatası olmadığından emin olun; proje strict TypeScript modunda çalışıyor.

## Vercel'e Deploy

1. Bu repoyu Vercel'de "Import Project" ile bağlayın.
2. Environment Variables kısmına `.env.local` içindeki değişkenleri ekleyin.
3. `main` dalına yapılan her push sonrası otomatik olarak yeniden deploy olur.

## Sırada ne var (henüz uygulanmadı)

- Yıllık çalışma takvimi otomasyonu (haftalara dağıtım)
- Bildirim gönderimi (e-posta/push)
- Özel ders randevu takvimi arayüzü
- Genel deneme sınavı modülü
- Şekilli/görselli soru desteği
