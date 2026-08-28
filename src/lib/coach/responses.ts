// Koç Pusula icin hazir cevap kutuphanesi. Gercek zamanli AI cagrisi YOK -
// tamamen onceden yazilmis, kategorilere ayrilmis metin havuzundan rastgele
// (ayni cevabin ust uste tekrarini engelleyerek) secim yapilir. {isim}/{konu}/
// {basari} gibi yer tutucular ogrencinin gercek verisiyle doldurularak
// "sabit ama kisisellestirilmis" bir his verir.

export type CoachCategory =
  | "karsilama"
  | "mutlu"
  | "sakin"
  | "yorgun"
  | "stresli"
  | "uzgun"
  | "sinirli"
  | "basari_kutlama"
  | "destek_dusuk_basari"
  | "calisma_hatirlatma"
  | "genel_motivasyon"
  | "vedalasma"
  | "guvenlik";

export type CoachContext = {
  isim: string;
  konu: string;
  basari: string;
};

const RESPONSES: Record<CoachCategory, string[]> = {
  karsilama: [
    "Merhaba {isim}! Seni burada görmek çok güzel. Bugün nasıl gidiyor?",
    "Selam {isim}! Ben Koç Pusula. Bugün sana nasıl eşlik edebilirim?",
    "Hoş geldin {isim}! Birlikte bugünü güzel bir çalışma gününe çevirelim mi?",
    "{isim}, karşımda görmek güzel! Bugün kendini nasıl hissediyorsun?",
    "Merhaba! Ben Koç Pusula, senin yol arkadaşınım. Bugün ne var ne yok {isim}?",
    "Selam {isim}! Küçük bir mola mı, yoksa çalışmaya mı hazırsın, birlikte bakalım.",
    "{isim}, bugün seninle konuşmak güzel olacak. Nasılsın bakalım?",
    "Merhaba kahramanım {isim}! Bugün hangi ruh halindesin?",
    "Selam {isim}, burada olduğun için mutluyum. Bugün canın nasıl?",
    "Hoş geldin! Ben Koç Pusula — {isim}, bugün neler hissediyorsun?",
    "{isim}, günaydın/iyi günler! Az önce buraya gelmen bile güzel bir adım.",
    "Merhaba {isim}! Bugün küçük ama değerli bir adım atmaya ne dersin?",
    "Selam {isim}, seni dinlemeye hazırım. Bugün nasıl geçiyor?",
    "{isim}! Burada olman harika. Bugün ruh halin nasıl?",
    "Merhaba {isim}, ben Koç Pusula. Bugün seninle ne konuşalım?",
  ],
  mutlu: [
    "Bunu duymak beni çok mutlu etti {isim}! Bu güzel enerjiyi çalışmana da taşı, harika şeyler olacak.",
    "Ne güzel {isim}! Mutlu olduğun günler en verimli günlerdir, bundan faydalanalım.",
    "Harika haber {isim}! Bu keyfini birkaç soru çözerek taçlandırmaya ne dersin?",
    "Çok sevindim {isim}! Mutluluğun bulaşıcı, bu enerjiyle bugün küçük bir hedef koyalım mı?",
    "Bu güzel ruh hali tam da öğrenmek için ideal {isim}. Hazır mısın?",
    "{isim}, mutlu olman beni de mutlu etti. Bu hisle 10 dakikalık bir çalışmaya ne dersin?",
    "Süper {isim}! İyi hissetmek başarının en iyi yakıtıdır, hadi bu enerjiyi değerlendirelim.",
    "Bunu duymak güzel {isim}! Bugün kendine küçük bir hedef koyup bu mutluluğu pekiştirelim mi?",
    "Harika {isim}, bu pozitif enerjiyle neler başarabileceğini merak ediyorum.",
    "{isim}, mutluluğun gözlerinden okunuyor gibi (yazından anlıyorum!). Bu ivmeyi kaybetmeyelim.",
    "Ne güzel bir haber {isim}! Mutlu anlar biriktirmeye devam edelim.",
    "Bu enerji bulaşıcı {isim}! Hadi bugün kendine küçük bir sınav koyalım, göster kendini.",
    "Çok güzel {isim}, mutlu olduğun için gurur duyuyorum. Bugün neyi başarmak istersin?",
    "{isim}, iyi hissetmen harika bir başlangıç. Bu hisle devam edelim mi?",
    "Sevindim buna {isim}! Mutlu bir zihin daha hızlı öğrenir, hadi deneyelim.",
  ],
  sakin: [
    "Sakin olman güzel {isim}, dengeli bir gün için harika bir zemin.",
    "Anladım {isim}, sakin bir gün de üretken olabilir. Küçük bir adım atalım mı?",
    "Sakin haller de değerlidir {isim}, zihnin dinlenmiş demek. Hazır olduğunda başlayalım.",
    "{isim}, sakinlik odaklanmak için iyi bir zemin. Bugün ne yapmak istersin?",
    "Normal bir gün de ilerlemeye engel değil {isim}, birlikte küçük bir hedef koyalım mı?",
    "Sakin bir ruh hali güzel {isim}. İster küçük bir tekrar, ister mola — sen karar ver.",
    "{isim}, her gün heyecanlı olmak zorunda değil. Sakin sakin ilerleyelim.",
    "Dengeli hissetmek de bir başarıdır {isim}. Bugün neye odaklanalım?",
    "Anlıyorum {isim}, sakin bir gün. İstersen bugünkü hedefini birlikte belirleyelim.",
    "{isim}, sakin sularda da güzel yol alınır. Ne dersin, küçük bir adım atalım mı?",
    "Sakin olman iyi bir işaret {isim}, net düşünmek için uygun bir zaman.",
    "{isim}, normal hissetmek gayet doğal. Bugün planına bir göz atalım mı?",
    "Sakin bir gün geçirmen de değerli {isim}. Hazır olunca haber ver.",
    "Anladım {isim}, bugün sakin bir tempo. Küçük ama istikrarlı adımlar en iyisidir.",
    "{isim}, sakinlik zihin açıklığı demek. Bunu değerlendirelim mi?",
  ],
  yorgun: [
    "Anlıyorum {isim}, yorgunluk gayet doğal. Kendine biraz nazik davran, dinlenmek de çalışmanın bir parçası.",
    "{isim}, yorgun hissetmek normal. İstersen bugün sadece 5 dakikalık kısa bir tekrar yapalım.",
    "Yorgunluk bir işaret {isim} — belki bugün biraz daha erken dinlenmelisin. Yarın daha güçlü döneriz.",
    "Anladım {isim}, herkes yorulur. Küçük bir mola verip sonra 10 dakika deneyelim mi?",
    "{isim}, dinlenmek tembellik değildir. Kendine izin ver, yarın devam ederiz.",
    "Yorgun olduğunu duyduğuma üzüldüm {isim}. Bugün kendine kolay gel, küçük adımlar yeter.",
    "{isim}, bazen en iyi çalışma, dinlenmeyi seçmektir. Bugün buna hakkın var.",
    "Anlıyorum, yorgunluk zor {isim}. İstersen sadece geçmiş konulara göz atmak gibi hafif bir şey yapalım.",
    "{isim}, yorgun bir zihinle zorlamak yerine kısa bir mola öneriyorum. Sonra tazelenmiş dönersin.",
    "Yorgunluk geçicidir {isim}, kendine iyi bak. Bugün küçük bir adım bile yeterli.",
    "{isim}, dinlenmiş bir zihin çok daha hızlı öğrenir. Bugün kendine izin ver.",
    "Anladım {isim}, yorgun günler olur. 5 dakikalık kısa bir göz atma yeterli olabilir.",
    "{isim}, yorgunluğunu ciddiye alıyorum. Belki bugün hafif bir tekrarla yetinelim.",
    "Yorgun hissetmek seni geride bırakmaz {isim}, sadece bir mola gerektirir.",
    "{isim}, kendine şefkatli ol. Dinlenip yarın daha güçlü devam edeceğine eminim.",
  ],
  stresli: [
    "Stresli hissetmen çok anlaşılır {isim}, sınav dönemleri zorlayıcı olabilir. Derin bir nefes alalım mı?",
    "{isim}, stres bazen bize önemsediğimizi hatırlatır. Küçük adımlarla bu yükü hafifletebiliriz.",
    "Anlıyorum {isim}, stres normal ama seni ele geçirmesine izin verme. Bir konuya odaklanalım, gerisi gelir.",
    "{isim}, stresli anlarda büyük resmi düşünmek yerine sadece 'şu an'a odaklanmak yardımcı olur. Hazırsan küçük bir adım atalım.",
    "Stres hissetmen sorun değil {isim} — biraz nefes alıp, tek bir küçük göreve odaklanalım mı?",
    "{isim}, her şeyi bir anda düşünmek yorucu olabilir. Gel, bugün için sadece bir hedef seçelim.",
    "Anlıyorum {isim}, kaygı zor bir duygu. Küçük, yönetilebilir adımlar bu hissi hafifletebilir.",
    "{isim}, stresli olman senin önemsediğinin göstergesi. Birlikte küçük bir plan yapalım mı?",
    "Stres anlarında en iyi şey küçük başarılar biriktirmektir {isim}. Bir soru ile başlayalım mı?",
    "{isim}, nefes al. Her şeyi bugün çözmek zorunda değilsin, sadece bir adım yeterli.",
    "Anladım {isim}, kaygılı hissetmek zor. Ama unutma, buraya kadar gelmiş olman bile bir başarı.",
    "{isim}, stres seni durdurmasın. Küçük bir hedefle başlayalım, geri kalanı zamanla gelir.",
    "Stresli günler geçer {isim}. Şu an için sadece bir konuya, tek bir soruya odaklanalım mı?",
    "{isim}, kaygını anlıyorum. İstersen konuşarak biraz rahatlayalım, sonra çalışmaya bakarız.",
    "Anlıyorum {isim}, stres ağır bir yük olabilir. Yalnız değilsin, birlikte küçük adımlarla ilerleriz.",
  ],
  uzgun: [
    "Üzgün hissetmen çok normal {isim}, herkesin böyle günleri olur. Yanındayım.",
    "{isim}, kendine karşı biraz daha nazik ol. Bir başarısızlık seni tanımlamaz.",
    "Anlıyorum {isim}, zor bir gün geçiriyorsun gibi. İstersen biraz konuşalım, ya da sadece mola verelim.",
    "{isim}, üzülmek de bu yolculuğun bir parçası. Yarın yeni bir gün, yeni bir başlangıç.",
    "Üzgün olduğunu duyduğuma üzüldüm {isim}. Unutma, her adım — küçük de olsa — değerli.",
    "{isim}, bazen işler istediğimiz gibi gitmez. Bu seni durdurmasın, ben yanındayım.",
    "Anlıyorum {isim}, zorlayıcı bir an. Kendine kızmak yerine, bugün küçük bir şeyle başlayalım mı?",
    "{isim}, üzgün hissetmek zayıflık değil. Bugün kendine karşı nazik ol, yarın devam ederiz.",
    "Bunu duyduğuma üzüldüm {isim}. Hatırlatmak isterim: buraya kadar gösterdiğin çaba bile değerli.",
    "{isim}, herkesin düştüğü günler olur, önemli olan tekrar kalkmak. Ben buradayım.",
    "Anlıyorum {isim}, üzüntü geçicidir. İstersen bugün sadece dinlenelim, yarın taze başlarız.",
    "{isim}, kendine sert davranma. Bir hata ya da kötü gün, senin kim olduğunu değiştirmez.",
    "Üzgün olman anlaşılır {isim}. Konuşmak istersen buradayım, istersen sessizce dinlenelim.",
    "{isim}, zor anlar geçicidir ama senin azmin kalıcı. Yanındayım.",
    "Anlıyorum {isim}, bugün ağır geliyor olabilir. Küçük bir nefes molası verelim mi?",
  ],
  sinirli: [
    "Sinirli hissetmen anlaşılır {isim}, bazen işler can sıkıcı olabilir. Derin bir nefes alalım mı?",
    "{isim}, sıkılmak ya da sinirlenmek gayet normal. İstersen konuyu değiştirip farklı bir şeye bakalım.",
    "Anlıyorum {isim}, bazı günler sabrımızı zorlar. Kısa bir mola işe yarayabilir.",
    "{isim}, sinirli hissetmek seni kötü biri yapmaz. Biraz nefes alıp tekrar bakalım mı?",
    "Sıkılman anlaşılır {isim}, aynı konuda kalmak yorucu olabilir. Farklı bir konuya geçelim mi?",
    "{isim}, öfke bazen yorgunluğun ya da baskının işaretidir. Kendine biraz mola ver.",
    "Anlıyorum {isim}, can sıkıcı bir an. İstersen 5 dakika uzaklaş, sonra taze gözle bakarız.",
    "{isim}, sinirlenmek insani bir şey. Şu an rahatlamak için ne yapmak istersin?",
    "Sıkıldığını duydum {isim}. Belki farklı bir ders ya da soru tipine geçmek işe yarar.",
    "{isim}, öfke geçicidir. Bir bardak su içip, kısa bir mola vermeye ne dersin?",
    "Anlıyorum {isim}, bazı şeyler gerçekten can sıkıcı olabiliyor. Yanındayım.",
    "{isim}, sinirlenmen normal — önemli olan bunu nasıl yönettiğin. Küçük bir mola önerebilir miyim?",
    "Sıkılman gayet doğal {isim}, aynı şeyi tekrar tekrar yapmak yorucu. Değişiklik yapalım mı?",
    "{isim}, öfkeni anlıyorum. İstersen biraz konuşalım, neyin seni sıktığını birlikte bulalım.",
    "Anlıyorum {isim}, bu his geçecek. Şimdilik kendine biraz alan tanı.",
  ],
  basari_kutlama: [
    "{isim}, son performansın gerçekten harika (%{basari} başarı)! Bu emeğin karşılığı.",
    "Vay be {isim}! %{basari} başarı oranı çok iyi, bu tempoyu koru!",
    "{isim}, bu ilerleme tesadüf değil, düzenli çalışmanın sonucu. Gurur duy kendinle!",
    "Harika gidiyorsun {isim}! %{basari}'lik başarı oranın, emeğinin karşılığı.",
    "{isim}, bu sonuçlar gösteriyor ki doğru yoldasın. Devam et!",
    "Süper iş {isim}! Bu başarıyı görmek beni çok mutlu etti.",
    "{isim}, %{basari} başarı oranıyla harika bir noktadasın. Bu ivmeyi kaybetme!",
    "Tebrikler {isim}! Bu sonuçlar senin azminin bir kanıtı.",
    "{isim}, bu gidişat gerçekten etkileyici. Kendinle gurur duymalısın.",
    "Bravo {isim}! Bu başarı oranı, emeğinin boşa gitmediğinin göstergesi.",
    "{isim}, harika bir performans sergiliyorsun. Böyle devam!",
    "Bu sonuçlar gerçekten güzel {isim}. Sıkı çalışmanın meyvesini alıyorsun.",
    "{isim}, %{basari} başarı ile gurur verici bir noktadasın. Tebrikler!",
    "Vay canına {isim}, harika ilerliyorsun! Bu tempoyu sürdür.",
    "{isim}, bu başarı senin. Kendine hak ettiğin takdiri ver!",
  ],
  destek_dusuk_basari: [
    "{isim}, şu anki başarı oranın (%{basari}) bir başlangıç noktası, son durak değil. Birlikte yükseltebiliriz.",
    "Herkesin zorlandığı konular vardır {isim}. Önemli olan pes etmemek. Küçük adımlarla ilerleyelim.",
    "{isim}, bu sayılar seni tanımlamaz. Bir konuya odaklanıp adım adım ilerleyelim mi?",
    "Zorlanman gayet normal {isim}, {konu} konusu birçok öğrenciye zor gelir. Beraber çalışalım.",
    "{isim}, düşük bir sonuç sadece 'henüz' anlamına gelir, 'asla' değil. Devam edelim.",
    "Anlıyorum {isim}, bu sonuçlar cesaret kırıcı olabilir. Ama her tekrar seni biraz daha güçlendiriyor.",
    "{isim}, hata yapmak öğrenmenin bir parçası. {konu} konusuna birlikte tekrar bakalım mı?",
    "Bu sonuçlar geçici {isim}, azimle değişebilir. Küçük bir adımla başlayalım.",
    "{isim}, kendine sabırlı ol. Her büyük ilerleme küçük adımlarla başlar.",
    "Zorlandığın konularda yalnız değilsin {isim}. Birlikte {konu} üzerinde çalışabiliriz.",
    "{isim}, bu an zor olabilir ama kalıcı değil. Bir sonraki denemede daha iyi olacaksın.",
    "Anlıyorum {isim}, düşük bir sonuç moralini bozabilir. Ama pes etmemek en önemlisi.",
    "{isim}, her uzman bir zamanlar acemiydi. {konu} konusunda birlikte ilerleyelim.",
    "Bu sonuçlar seni durdurmasın {isim}. Küçük, düzenli tekrarlar büyük fark yaratır.",
    "{isim}, zorlandığın yerler, en çok gelişeceğin yerlerdir. Beraber çalışalım.",
  ],
  calisma_hatirlatma: [
    "{isim}, çalışma programında {konu} seni bekliyor. Hazır olduğunda göz atmaya ne dersin?",
    "Aklımda bir şey var {isim}: {konu} konusunu tamamlamak için harika bir zaman olabilir.",
    "{isim}, programında {konu} var. Küçük bir adımla başlamaya ne dersin?",
    "Hatırlatmak isterim {isim}: {konu} konusu seni bekliyor, hazır olduğunda bakabilirsin.",
    "{isim}, bugün {konu} üzerinde biraz çalışmaya ne dersin? Küçük adımlar büyük fark yaratır.",
    "Programında {konu} var {isim}. İstersen bugün buna biraz zaman ayıralım.",
    "{isim}, {konu} konusunu tamamlamak listendeki bir sonraki adım. Hazır mısın?",
    "Küçük bir hatırlatma {isim}: {konu} konusu seni bekliyor.",
    "{isim}, bugün müsaitsen {konu} konusuna bir göz atmak güzel olur.",
    "Programında bekleyen {konu} var {isim}, ne zaman hazır olursan.",
    "{isim}, {konu} konusuna kısa bir bakış bile ilerleme sayılır.",
    "Unutma {isim}: {konu} konusu listende. Bugün ya da yarın, senin tempon.",
    "{isim}, {konu} üzerinde çalışmak istersen buradayım, birlikte bakabiliriz.",
    "Programında {konu} görünüyor {isim}. Küçük bir adım atmaya hazır mısın?",
    "{isim}, {konu} konusuna göz atmak için bugün güzel bir gün olabilir.",
  ],
  genel_motivasyon: [
    "{isim}, unutma: her uzman bir zamanlar acemiydi. Sen de yolun başındasın ve harika gidiyorsun.",
    "Küçük adımlar {isim}, büyük hedeflere götürür. Bugün bir adım daha at.",
    "{isim}, düzenli çalışmak yetenekten daha güçlüdür. Sen bunu yapabilirsin.",
    "Unutma {isim}: ilerleme, mükemmellik değil, tutarlılık gerektirir.",
    "{isim}, bugün attığın her adım, geleceğine yapılan bir yatırım.",
    "Sen düşündüğünden çok daha güçlüsün {isim}. Devam et.",
    "{isim}, zorluklar seni güçlendirir, durdurmaz. İnanıyorum sana.",
    "Bugün küçük bir hedef koy {isim}, yarın onu büyütürsün.",
    "{isim}, kendine inan. Buraya kadar gelmiş olman bile bir başarı.",
    "Her gün biraz daha iyi olmak yeterli {isim}, mükemmel olmana gerek yok.",
    "{isim}, azmin seni hedefine götürecek. Ben buna inanıyorum.",
    "Unutma {isim}: bugün ektiğin tohum, yarının başarısı olacak.",
    "{isim}, kendinle yarış, başkalarıyla değil. Dünkü halinden daha iyisin.",
    "Bugün de kendine bir söz ver {isim}: küçük ama istikrarlı bir adım.",
    "{isim}, senin potansiyelin sınırsız. Sadece bir adım at, gerisi gelir.",
    "Zorluklar geçici {isim}, azmin kalıcı. Devam et.",
    "{isim}, bugün yorgun da olsan, yarın daha güçlü olacaksın.",
    "Kendine güven {isim}, çünkü ben sana güveniyorum.",
    "{isim}, en büyük başarılar en küçük adımlarla başlar. Hadi başlayalım.",
    "Sen harikasın {isim}, bunu unutma. Bugün de bir adım daha at.",
  ],
  vedalasma: [
    "Görüşmek üzere {isim}! Ne zaman istersen buradayım.",
    "Kendine iyi bak {isim}, yakında yine konuşuruz!",
    "{isim}, bugün için bu kadar yeter. Kendinle gurur duy!",
    "Hoşça kal {isim}! Unutma, her zaman buradayım.",
    "{isim}, iyi dinlenmeler. Yarın yine buradayım!",
    "Görüşürüz {isim}! Bugün attığın adımlar için teşekkürler.",
    "{isim}, kendine iyi bak. Ben Koç Pusula, her an hazırım.",
    "Bugünlük bu kadar {isim}! Harika bir gün geçirmeni dilerim.",
    "{isim}, seninle konuşmak güzeldi. Ne zaman istersen buradayım.",
    "Hoşça kal {isim}! Unutma, küçük adımlar büyük farklar yaratır.",
  ],
  guvenlik: [
    "{isim}, bu duygular çok ağır gibi görünüyor ve bunları benimle paylaşman çok değerli. Ama bu konuda sana en iyi yardımı bir yetişkin (ailen, öğretmenin veya bir uzman) verebilir. Lütfen bunu güvendiğin biriyle konuş, yalnız değilsin.",
    "{isim}, söylediklerin beni endişelendirdi. Bunun hakkında konuşman çok önemli — lütfen ailenle, öğretmeninle ya da güvendiğin bir yetişkinle bu duyguları paylaş. Yanında olacaklardır.",
    "{isim}, bu tür duyguları tek başına taşımana gerek yok. Lütfen hemen güvendiğin bir yetişkinle (ailen, öğretmenin) konuş. Sen değerlisin ve yardım almayı hak ediyorsun.",
  ],
};

const MOOD_KEYWORDS: { category: CoachCategory; keywords: string[] }[] = [
  { category: "guvenlik", keywords: ["kendime zarar", "canıma kıy", "intihar", "yaşamak istemiyorum", "ölmek istiyorum", "ölesim geliyor"] },
  { category: "mutlu", keywords: ["mutlu", "sevindim", "harika hissediyorum", "keyifliyim", "neşeli", "iyiyim", "süperim"] },
  { category: "yorgun", keywords: ["yorgun", "bitkin", "uykum", "uykusuz", "bitap", "halsiz"] },
  { category: "stresli", keywords: ["stres", "kaygı", "kaygılı", "endişeli", "gerginim", "panik"] },
  { category: "uzgun", keywords: ["üzgün", "üzülüyorum", "kötü hissediyorum", "başaramıyorum", "başarısız", "moralim bozuk", "canım sıkkın"] },
  { category: "sinirli", keywords: ["sinirli", "sinirliyim", "sıkıldım", "bunaldım", "öfkeli", "kızgınım"] },
  { category: "sakin", keywords: ["sakin", "normal", "idare eder", "fena değil", "şöyle böyle"] },
];

// Ayni cevabin arka arkaya gelmesini engellemek icin, kategori bazinda son
// gosterilen index'i tutuyoruz (component yeniden monte edilince sifirlanir,
// bu kadari yeterli - kalici bir hafizaya gerek yok).
const lastIndexByCategory = new Map<CoachCategory, number>();

export function fillTemplate(template: string, ctx: CoachContext): string {
  return template
    .replaceAll("{isim}", ctx.isim)
    .replaceAll("{konu}", ctx.konu)
    .replaceAll("{basari}", ctx.basari);
}

export function pickResponse(category: CoachCategory, ctx: CoachContext): string {
  const pool = RESPONSES[category];
  let index = Math.floor(Math.random() * pool.length);
  const last = lastIndexByCategory.get(category);
  if (pool.length > 1 && index === last) {
    index = (index + 1) % pool.length;
  }
  lastIndexByCategory.set(category, index);
  return fillTemplate(pool[index], ctx);
}

// Ogrencinin serbest metnini basit anahtar kelime eslestirmesiyle bir
// kategoriye yonlendirir. Hicbir sey eslesmezse null doner (cagiran taraf
// genel_motivasyon'a dusurur).
export function detectCategory(text: string): CoachCategory | null {
  const normalized = text.toLocaleLowerCase("tr-TR");
  for (const { category, keywords } of MOOD_KEYWORDS) {
    if (keywords.some((k) => normalized.includes(k))) {
      return category;
    }
  }
  return null;
}
