# Odak — Sınav Hazırlık Platformu (iskelet)

1. sınıftan 12. sınıfa, LGS/TYT/AYT/YKS/KPSS/ALES hazırlığı için admin / öğretmen / öğrenci rolleriyle
çalışan, yapay zeka destekli eksik tespiti ve özel derse yönlendirme yapan platformun ilk iskeleti.

## Kurulum

### 1. Bağımlılıklar
```bash
npm install
```

### 2. Supabase projesi
1. https://supabase.com üzerinde yeni bir proje oluşturun.
2. Proje Ayarları → API sayfasından `Project URL`, `anon public key` ve `service_role key` değerlerini alın.
3. SQL Editor'de sırasıyla şu dosyaları çalıştırın:
   - `supabase/migrations/0001_init.sql` (tablolar, roller, RLS)
   - `supabase/migrations/0002_seed.sql` (örnek ders/konu verisi)
4. İlk admin kullanıcıyı oluşturmak için: Authentication → Users'dan bir kullanıcı ekleyin,
   sonra SQL Editor'de:
   ```sql
   insert into profiles (id, role, full_name, email)
   values ('<auth.users tablosundaki id>', 'admin', 'Ad Soyad', 'eposta@ornek.com');
   ```

### 3. Ortam değişkenleri
`.env.example` dosyasını `.env.local` olarak kopyalayıp değerleri doldurun:
```bash
cp .env.example .env.local
```

### 4. Geliştirme sunucusu
```bash
npm run dev
```

## Vercel'e Deploy

1. Bu repoyu Vercel'de "Import Project" ile bağlayın.
2. Environment Variables kısmına `.env.local` içindeki 4 değişkeni ekleyin.
3. Deploy edin — her `git push` sonrası otomatik olarak yeniden deploy olur.

## Roller

- **Admin** (`/admin`): kullanıcı listesi, müfredat genel görünümü, AI üretimi soruların onayı.
- **Öğretmen** (`/ogretmen`): konu anlatımı ekleme, elle soru ekleme, AI ile soru taslağı ürettirme,
  özel ders taleplerini görme.
- **Öğrenci** (`/ogrenci`): konu seçip "biliyorum / bilmiyorum" ile teste girme ya da programa ekleme,
  test sonucunda otomatik AI eksik analizi, ilerleme raporu.
- **Veli**: `parent_student_links` tablosu ile bir öğrenciye bağlanır, `/ogrenci/rapor` üzerinden
  çocuğunun ilerlemesini görür (aynı sayfa, rol bazlı veri filtresi).

## Sırada ne var (henüz uygulanmadı)

- Yıllık çalışma takvimi otomasyonu (haftalara dağıtım)
- Bildirim gönderimi (e-posta/push)
- Özel ders randevu takvimi arayüzü
- Genel deneme sınavı modülü (çoklu konu, süreli sınav ekranı)
- Şekilli/görselli soru desteği (parametrik SVG üretimi)
