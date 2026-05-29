/**
 * 81 il × 3 nöbetçi muhabir — yerel kültür / Yeşilçam / modern isim harmanı.
 * Anahtar: TURKIYE_ILLER.name ile birebir eşleşir.
 */

export type ReporterCityKey =
  | "Adana"
  | "Adıyaman"
  | "Afyonkarahisar"
  | "Ağrı"
  | "Amasya"
  | "Ankara"
  | "Antalya"
  | "Artvin"
  | "Aydın"
  | "Balıkesir"
  | "Bilecik"
  | "Bingöl"
  | "Bitlis"
  | "Bolu"
  | "Burdur"
  | "Bursa"
  | "Çanakkale"
  | "Çankırı"
  | "Çorum"
  | "Denizli"
  | "Diyarbakır"
  | "Edirne"
  | "Elazığ"
  | "Erzincan"
  | "Erzurum"
  | "Eskişehir"
  | "Gaziantep"
  | "Giresun"
  | "Gümüşhane"
  | "Hakkari"
  | "Hatay"
  | "Isparta"
  | "Mersin"
  | "İstanbul"
  | "İzmir"
  | "Kars"
  | "Kastamonu"
  | "Kayseri"
  | "Kırklareli"
  | "Kırşehir"
  | "Kocaeli"
  | "Konya"
  | "Kütahya"
  | "Malatya"
  | "Manisa"
  | "Kahramanmaraş"
  | "Mardin"
  | "Muğla"
  | "Muş"
  | "Nevşehir"
  | "Niğde"
  | "Ordu"
  | "Rize"
  | "Sakarya"
  | "Samsun"
  | "Siirt"
  | "Sinop"
  | "Sivas"
  | "Tekirdağ"
  | "Tokat"
  | "Trabzon"
  | "Tunceli"
  | "Şanlıurfa"
  | "Uşak"
  | "Van"
  | "Yozgat"
  | "Zonguldak"
  | "Aksaray"
  | "Bayburt"
  | "Karaman"
  | "Kırıkkale"
  | "Batman"
  | "Şırnak"
  | "Bartın"
  | "Ardahan"
  | "Iğdır"
  | "Yalova"
  | "Karabük"
  | "Kilis"
  | "Osmaniye"
  | "Düzce";

export const REPORTERS_BY_CITY: Record<ReporterCityKey, readonly [string, string, string]> = {
  Adana: ["Yılmaz Güney", "Ramazan Candan", "Zeynep Kozan"],
  Adıyaman: ["Besir Atalay", "Hüseyin Kaplan", "Nuri Çelik"],
  Afyonkarahisar: ["İsmail Dümbelek", "Halil Sarı", "Ayşe Mermer"],
  Ağrı: ["Cemal Güneş", "Ferhat Dağ", "Leyla Ararat"],
  Amasya: ["Ferhat Aksu", "Yeşim Sarı", "Murat Taşova"],
  Ankara: ["Behzat Çelik", "Zafer Akın", "Selin Kızılay"],
  Antalya: ["Kemal Sunal", "Hakan Turizm", "Defne Sahil"],
  Artvin: ["Yusuf Karadeniz", "Elif Çoruh", "Mert Yayla"],
  Aydın: ["Cüneyt Arkın", "Pamuk Tarla", "Deniz Efeler"],
  Balıkesir: ["Ayvalık Rıza", "Bandırma Ferit", "Edremit Güneş"],
  Bilecik: ["Osman Söğüt", "Pelin Vadi", "Kemal Bozüyük"],
  Bingöl: ["Serhat Dağ", "Munzur Ali", "Zehra Yüce"],
  Bitlis: ["Nemrut Halil", "Tatvan Selim", "Van Gölü Ayşe"],
  Bolu: ["Kartalkaya Murat", "Abant Elif", "Mengen Aşçı"],
  Burdur: ["Salda Gölü Emre", "Burdur Halil", "Göl Kenarı Aylin"],
  Bursa: ["Tunç Demir", "İskender Usta", "Nilüfer Nazlı"],
  Çanakkale: ["Gelibolu Mehmet", "Truva Kemal", "Ece Deniz"],
  Çankırı: ["Ilgaz Murat", "Tuz Mağarası Ali", "Çankırı Ferit"],
  Çorum: ["Hitit Kemal", "Leblebi Hüseyin", "Osmancık Ayşe"],
  Denizli: ["Pamukkale Selin", "Horozlu Kemal", "Denizli Ferit"],
  Diyarbakır: ["Sur Diyar", "Hevsel Narin", "Dicle Murat"],
  Edirne: ["Kırkpınar Ali", "Selimiye Kemal", "Meriç Elif"],
  Elazığ: ["Harput Kemal", "Keban Murat", "Fırat Selin"],
  Erzincan: ["Munzur Ferit", "Kemaliye Ayşe", "Ergan Dağı Murat"],
  Erzurum: ["Palandöken Cem", "Oltu Taşı Kemal", "Çifte Minare Selin"],
  Eskişehir: ["Lületaşı Murat", "Porsuk Kenan", "Odunpazarı Elif"],
  Gaziantep: ["Baklava Usta", "Zeugma Kemal", "Antep Baharatı Ayşe"],
  Giresun: ["Fındık Kemal", "Giresun Selim", "Karadeniz Nazlı"],
  Gümüşhane: ["Gümüş Kemal", "Kelkit Murat", "Torul Elif"],
  Hakkari: ["Cilo Dağı Ferit", "Hakkari Murat", "Zap Vadisi Ayşe"],
  Hatay: ["Antakya Kemal", "Künefe Usta", "Defne Selin"],
  Isparta: ["Gül Kemal", "Isparta Murat", "Eğirdir Gölü Elif"],
  Mersin: ["Tarsus Kemal", "Çukurova Selin", "Akdeniz Murat"],
  İstanbul: ["Kemal Kent", "Avrupa Yakası Murat", "Boğaz Kenan"],
  İzmir: ["Ege Selin", "Kordon Kemal", "İzmirli Ferit"],
  Kars: ["Ani Harabeleri Murat", "Kars Peynirli Kemal", "Sarıkamış Elif"],
  Kastamonu: ["Taşköprü Murat", "Kastamonu Kemal", "İnebolu Selin"],
  Kayseri: ["Erciyes Murat", "Pastırma Kemal", "Kapadokya Kapısı Elif"],
  Kırklareli: ["Lozan Ferit", "Istranca Murat", "Kırklareli Kemal"],
  Kırşehir: ["Ahi Evran Murat", "Kırşehir Kemal", "Obruk Selin"],
  Kocaeli: ["İzmit Murat", "Kartepe Kemal", "Gebze Ferit"],
  Konya: ["Mevlana Kemal", "Beyşehir Murat", "Konya Selçuklu Elif"],
  Kütahya: ["Çini Usta", "Kütahya Kemal", "Aizanoi Murat"],
  Malatya: ["Kayısı Kemal", "Malatya Murat", "Apricot Selin"],
  Manisa: ["Ahmet Bedevi", "Mesir Macunu Usta", "Spil Dağı Murat"],
  Kahramanmaraş: ["Maraş Dondurması Kemal", "Dulkadiroğlu Murat", "Oniki Şubat Elif"],
  Mardin: ["Taş Evler Murat", "Mardin Kemal", "Mezopotamya Selin"],
  Muğla: ["Bodrum Murat", "Fethiye Kemal", "Datça Selin"],
  Muş: ["Muş Ovası Kemal", "Malazgirt Murat", "Varto Elif"],
  Nevşehir: ["Peri Bacası Murat", "Kapadokya Kemal", "Ürgüp Selin"],
  Niğde: ["Alaaddin Tepesi Murat", "Niğde Kemal", "Bor Elif"],
  Ordu: ["Fındık Sahili Murat", "Ordu Kemal", "Perşembe Selin"],
  Rize: ["Çay Murat", "Rize Kemal", "Fırtına Vadisi Elif"],
  Sakarya: ["Sapanca Murat", "Sakarya Kemal", "Adapazarı Ferit"],
  Samsun: ["Amazon Kemal", "Samsun Murat", "Bafra Selin"],
  Siirt: ["Siirt Fıstığı Kemal", "Tillo Murat", "Botan Selin"],
  Sinop: ["Sinop Limanı Murat", "Hamsi Kemal", "İnceburun Elif"],
  Sivas: ["Kangal Murat", "Sivas Kemal", "Divriği Selin"],
  Tekirdağ: ["Rakıcı Kemal", "Tekirdağ Murat", "Şarköy Selin"],
  Tokat: ["Tokat Kebabı Kemal", "Niksar Murat", "Yeşilırmak Elif"],
  Trabzon: ["Hamsi Kemal", "Trabzon Murat", "Sümela Selin"],
  Tunceli: ["Munzur Murat", "Tunceli Kemal", "Dersim Elif"],
  Şanlıurfa: ["Balıklıgöl Murat", "Urfa Kebabı Kemal", "Göbeklitepe Selin"],
  Uşak: ["Kilim Usta", "Uşak Kemal", "Banaz Murat"],
  Van: ["Van Kedisi Murat", "Akdamar Kemal", "Tuzlu Göl Selin"],
  Yozgat: ["Süleyman Çakır", "Bozok Murat", "Yozgat Kemal"],
  Zonguldak: ["Maden Murat", "Zonguldak Kemal", "Filyos Selin"],
  Aksaray: ["Ihlara Vadisi Murat", "Aksaray Kemal", "Sultanhanı Elif"],
  Bayburt: ["Kop Dağı Murat", "Bayburt Kemal", "Çoruh Kenan"],
  Karaman: ["Karamanoğlu Murat", "Karaman Kemal", "Ermenek Selin"],
  Kırıkkale: ["Erdal Bakkal", "Kırıkkale Murat", "Keskin Ferit"],
  Batman: ["Petrol Kent Murat", "Batman Kemal", "Hasankeyf Selin"],
  Şırnak: ["Cudi Murat", "Şırnak Kemal", "Silopi Ferit"],
  Bartın: ["Amasra Murat", "Bartın Kemal", "Çeşme Limanı Elif"],
  Ardahan: ["Çıldır Gölü Murat", "Ardahan Kemal", "Posof Ferit"],
  Iğdır: ["Ağrı Dağı Murat", "Iğdır Kemal", "Tuzluca Selin"],
  Yalova: ["Termal Murat", "Yalova Kemal", "Çınarcık Ferit"],
  Karabük: ["Hadrianopolis Murat", "Karabük Kemal", "Safranbolu Selin"],
  Kilis: ["Zeytin Dalı Murat", "Kilis Kemal", "Suriye Sınırı Ferit"],
  Osmaniye: ["Karatepe Murat", "Osmaniye Kemal", "Düziçi Selin"],
  Düzce: ["Melen Murat", "Düzce Kemal", "Akçakoca Ferit"],
};

/** Şehir tespit edilemezse — genel editör nöbetçileri */
export const GENERAL_REPORTERS: readonly string[] = [
  "Kemal Kent",
  "Ayşe Nur Demir",
  "Murat Yıldırım",
  "Selin Aksoy",
  "Barış Korkmaz",
  "Deniz Arslan",
  "Ece Yaman",
  "Onur Tekin",
  "Pınar Güler",
  "Cem Öztürk",
];
