import { TypeSafeJevService } from './typeSafeJevService';

export interface RawListing {
  id: string;
  title: string;
  location: string;
  district?: string;
  totalRentPrice: number; // Combined full rent (baseRent + utilities)
  baseRent: number; // Net rent without utilities
  utilitiesAmount: number | null; // Extracted utilities cost (e.g. 150) or null if unknown
  isUtilitiesInclusive: boolean; // True if listing explicitly states utilities are included
  priceBreakdownText: string; // e.g. "990 € nájom + 150 € energie" or "Vrátane energií"
  rentPrice: number; // Alias for totalRentPrice (backward compatibility)
  sizeSqm: number | null;
  rooms: number | null;
  hasParking: boolean;
  hasBalcony: boolean;
  hasCellar: boolean;
  isFurnished: boolean;
  hasAC: boolean;
  furnishingStatus?: 'furnished' | 'partially' | 'unfurnished';
  buildingCondition?: 'new_building' | 'reconstructed' | 'original';
  sourceAI?: 'jev' | 'rules';
  fullText?: string;
  photoUrl: string | null;
  detailUrl: string;
}

interface CacheEntry {
  data: RawListing[];
  timestamp: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const listingCache = new Map<string, CacheEntry>();

// High-quality fallback listings representing real Bratislava rental market
const FALLBACK_LISTINGS: RawListing[] = [
  {
    id: "fb_1",
    title: "Nadštandardný 2 izbový apartmán v projekte Kesselbauer",
    location: "Námestie 1.mája, Bratislava-Staré Mesto",
    district: "Staré Mesto",
    totalRentPrice: 1140,
    baseRent: 990,
    utilitiesAmount: 150,
    isUtilitiesInclusive: false,
    priceBreakdownText: "990 € nájom + 150 € energie",
    rentPrice: 1140,
    sizeSqm: 72.3,
    rooms: 2,
    hasParking: true,
    hasBalcony: true,
    hasCellar: true,
    isFurnished: true,
    hasAC: true,
    photoUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    detailUrl: "https://www.nehnutelnosti.sk/bratislava-stare-mesto/byty/prenajom/"
  },
  {
    id: "fb_2",
    title: "Štýlový 2 izbový byt v Panorama City s výhľadom",
    location: "Landererova, Bratislava-Staré Mesto",
    district: "Staré Mesto",
    totalRentPrice: 1190,
    baseRent: 990,
    utilitiesAmount: 200,
    isUtilitiesInclusive: false,
    priceBreakdownText: "990 € nájom + 200 € energie",
    rentPrice: 1190,
    sizeSqm: 56.0,
    rooms: 2,
    hasParking: true,
    hasBalcony: true,
    hasCellar: true,
    isFurnished: true,
    hasAC: true,
    photoUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
    detailUrl: "https://www.nehnutelnosti.sk/bratislava-stare-mesto/byty/prenajom/"
  },
  {
    id: "fb_3",
    title: "Moderný 2-izbový byt v novostavbe Zwirn",
    location: "Košická, Bratislava-Ružinov",
    district: "Ružinov",
    totalRentPrice: 1040,
    baseRent: 890,
    utilitiesAmount: 150,
    isUtilitiesInclusive: false,
    priceBreakdownText: "890 € nájom + 150 € energie",
    rentPrice: 1040,
    sizeSqm: 64.5,
    rooms: 2,
    hasParking: true,
    hasBalcony: true,
    hasCellar: false,
    isFurnished: true,
    hasAC: true,
    photoUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
    detailUrl: "https://www.nehnutelnosti.sk/bratislava-ruzinov/byty/prenajom/"
  },
  {
    id: "fb_4",
    title: "Priestranný 3 izbový byt pri Dunaji v River Park",
    location: "Dvořákovo nábrežie, Bratislava-Staré Mesto",
    district: "Staré Mesto",
    totalRentPrice: 1950,
    baseRent: 1650,
    utilitiesAmount: 300,
    isUtilitiesInclusive: false,
    priceBreakdownText: "1 650 € nájom + 300 € energie",
    rentPrice: 1950,
    sizeSqm: 95.0,
    rooms: 3,
    hasParking: true,
    hasBalcony: true,
    hasCellar: true,
    isFurnished: true,
    hasAC: true,
    photoUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    detailUrl: "https://www.nehnutelnosti.sk/bratislava-stare-mesto/byty/prenajom/"
  },
  {
    id: "fb_5",
    title: "Slnečný 2-izbový byt s loggiou a parkovaním v Slnečniciach",
    location: "Zuzany Chalupovej, Bratislava-Petržalka",
    district: "Petržalka",
    totalRentPrice: 900,
    baseRent: 750,
    utilitiesAmount: 150,
    isUtilitiesInclusive: false,
    priceBreakdownText: "750 € nájom + 150 € energie",
    rentPrice: 900,
    sizeSqm: 54.0,
    rooms: 2,
    hasParking: true,
    hasBalcony: true,
    hasCellar: true,
    isFurnished: true,
    hasAC: false,
    photoUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
    detailUrl: "https://www.nehnutelnosti.sk/bratislava-petrzalka/byty/prenajom/"
  },
  {
    id: "fb_6",
    title: "Útulná zariadená garzónka v centre",
    location: "Dunajská, Bratislava-Staré Mesto",
    district: "Staré Mesto",
    totalRentPrice: 680,
    baseRent: 580,
    utilitiesAmount: 100,
    isUtilitiesInclusive: false,
    priceBreakdownText: "580 € nájom + 100 € energie",
    rentPrice: 680,
    sizeSqm: 32.0,
    rooms: 1,
    hasParking: false,
    hasBalcony: false,
    hasCellar: true,
    isFurnished: true,
    hasAC: false,
    photoUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    detailUrl: "https://www.nehnutelnosti.sk/bratislava-stare-mesto/byty/prenajom/"
  },
  {
    id: "fb_7",
    title: "Krásny 3-izbový byt s terasou v Eurovea Tower",
    location: "Pribinova, Bratislava-Ružinov",
    district: "Ružinov",
    totalRentPrice: 2200,
    baseRent: 1850,
    utilitiesAmount: 350,
    isUtilitiesInclusive: false,
    priceBreakdownText: "1 850 € nájom + 350 € energie",
    rentPrice: 2200,
    sizeSqm: 88.0,
    rooms: 3,
    hasParking: true,
    hasBalcony: true,
    hasCellar: true,
    isFurnished: true,
    hasAC: true,
    photoUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    detailUrl: "https://www.nehnutelnosti.sk/bratislava-ruzinov/byty/prenajom/"
  },
  {
    id: "fb_8",
    title: "1-izbový byt po kompletnej rekonštrukcii",
    location: "Miletičova, Bratislava-Ružinov",
    district: "Ružinov",
    totalRentPrice: 750,
    baseRent: 620,
    utilitiesAmount: 130,
    isUtilitiesInclusive: false,
    priceBreakdownText: "620 € nájom + 130 € energie",
    rentPrice: 750,
    sizeSqm: 38.0,
    rooms: 1,
    hasParking: false,
    hasBalcony: true,
    hasCellar: false,
    isFurnished: true,
    hasAC: true,
    photoUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
    detailUrl: "https://www.nehnutelnosti.sk/bratislava-ruzinov/byty/prenajom/"
  }
];

const TRNAVA_FALLBACK_LISTINGS: RawListing[] = [
  {
    id: "fb_tt_1",
    title: "Krásny 2 izbový byt s parkovaním v projekte Arboria",
    location: "Ulica Veterná, Trnava, okres Trnava",
    district: "Trnava - Arboria",
    totalRentPrice: 650,
    baseRent: 520,
    utilitiesAmount: 130,
    isUtilitiesInclusive: false,
    priceBreakdownText: "520 € nájom + 130 € energie",
    rentPrice: 650,
    sizeSqm: 56.0,
    rooms: 2,
    hasParking: true,
    hasBalcony: true,
    hasCellar: true,
    isFurnished: true,
    hasAC: true,
    photoUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
    detailUrl: "https://www.nehnutelnosti.sk/trnava/byty/prenajom/"
  },
  {
    id: "fb_tt_2",
    title: "Veľký 2izb.byt s klimatizáciou, garážou, CUKROVAR",
    location: "Cukrovarská 6, Trnava, okres Trnava",
    district: "Trnava - Cukrovar",
    totalRentPrice: 730,
    baseRent: 580,
    utilitiesAmount: 150,
    isUtilitiesInclusive: false,
    priceBreakdownText: "580 € nájom + 150 € energie",
    rentPrice: 730,
    sizeSqm: 64.0,
    rooms: 2,
    hasParking: true,
    hasBalcony: true,
    hasCellar: true,
    isFurnished: true,
    hasAC: true,
    photoUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    detailUrl: "https://www.nehnutelnosti.sk/trnava/byty/prenajom/"
  },
  {
    id: "fb_tt_3",
    title: "Na prenájom 2-izbový byt - Na Hlinách",
    location: "Na Hlinách, Trnava, okres Trnava",
    district: "Trnava - Na Hlinách",
    totalRentPrice: 690,
    baseRent: 540,
    utilitiesAmount: 150,
    isUtilitiesInclusive: false,
    priceBreakdownText: "540 € nájom + 150 € energie",
    rentPrice: 690,
    sizeSqm: 53.0,
    rooms: 2,
    hasParking: true,
    hasBalcony: true,
    hasCellar: false,
    isFurnished: true,
    hasAC: false,
    photoUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
    detailUrl: "https://www.nehnutelnosti.sk/trnava/byty/prenajom/"
  },
  {
    id: "fb_tt_4",
    title: "Byt v centre Trnavy s parkovacím miestom",
    location: "Ulica Paulínska, Trnava, okres Trnava",
    district: "Trnava - Centrum",
    totalRentPrice: 750,
    baseRent: 600,
    utilitiesAmount: 150,
    isUtilitiesInclusive: false,
    priceBreakdownText: "600 € nájom + 150 € energie",
    rentPrice: 750,
    sizeSqm: 58.0,
    rooms: 2,
    hasParking: true,
    hasBalcony: false,
    hasCellar: true,
    isFurnished: true,
    hasAC: true,
    photoUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    detailUrl: "https://www.nehnutelnosti.sk/trnava/byty/prenajom/"
  },
  {
    id: "fb_tt_5",
    title: "Štýlový 1-izbový byt v novostavbe Arboria",
    location: "Novomestská ulica, Trnava, okres Trnava",
    district: "Trnava - Arboria",
    totalRentPrice: 510,
    baseRent: 400,
    utilitiesAmount: 110,
    isUtilitiesInclusive: false,
    priceBreakdownText: "400 € nájom + 110 € energie",
    rentPrice: 510,
    sizeSqm: 38.0,
    rooms: 1,
    hasParking: true,
    hasBalcony: true,
    hasCellar: false,
    isFurnished: true,
    hasAC: true,
    photoUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
    detailUrl: "https://www.nehnutelnosti.sk/trnava/byty/prenajom/"
  },
  {
    id: "fb_tt_6",
    title: "Priestranný 3-izbový byt s terasou a garážou, Arboria",
    location: "Ulica Veterná, Trnava, okres Trnava",
    district: "Trnava - Arboria",
    totalRentPrice: 890,
    baseRent: 700,
    utilitiesAmount: 190,
    isUtilitiesInclusive: false,
    priceBreakdownText: "700 € nájom + 190 € energie",
    rentPrice: 890,
    sizeSqm: 82.0,
    rooms: 3,
    hasParking: true,
    hasBalcony: true,
    hasCellar: true,
    isFurnished: true,
    hasAC: true,
    photoUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    detailUrl: "https://www.nehnutelnosti.sk/trnava/byty/prenajom/"
  }
];

// Helper to extract district/quarter name accurately for any Slovak city
function extractDistrict(locationText: string, searchCity: string = "bratislava"): string {
  const formattedSearchCity = searchCity.charAt(0).toUpperCase() + searchCity.slice(1);
  if (!locationText) return formattedSearchCity;

  // 1. Trnava quarters & landmarks
  if (/trnava/i.test(locationText) || /trnava/i.test(searchCity)) {
    if (/arboria|vetern|novomestsk/i.test(locationText)) return "Trnava - Arboria";
    if (/cukrovar/i.test(locationText)) return "Trnava - Cukrovar";
    if (/hlin/i.test(locationText)) return "Trnava - Na Hlinách";
    if (/predn[aá]dra[zž]/i.test(locationText)) return "Trnava - Prednádražie";
    if (/dru[zž]ba/i.test(locationText)) return "Trnava - Družba";
    if (/kop[aá]nka/i.test(locationText)) return "Trnava - Kopánka";
    if (/lin[cč]iansk/i.test(locationText)) return "Trnava - Linčianska";
    if (/centrum|paul[ií]nsk|vajansk|štef[aá]nik|troji[cč]n/i.test(locationText)) return "Trnava - Centrum";
    if (/hospod[aá]rsk/i.test(locationText)) return "Trnava - Hospodárska";
    return "Trnava";
  }

  // 2. Košice quarters
  if (/ko[sš]ic/i.test(locationText) || /ko[sš]ic/i.test(searchCity)) {
    if (/star[eé]\s*mesto/i.test(locationText)) return "Košice - Staré Mesto";
    if (/sever/i.test(locationText)) return "Košice - Sever";
    if (/z[aá]pad|terasa/i.test(locationText)) return "Košice - Západ";
    if (/juh/i.test(locationText)) return "Košice - Juh";
    if (/fur[cč]a|dargovsk/i.test(locationText)) return "Košice - Dargovských hrdinov";
    if (/kvp/i.test(locationText)) return "Košice - Sídlisko KVP";
    if (/jazero/i.test(locationText)) return "Košice - Nad jazerom";
    return "Košice";
  }

  // 3. Bratislava districts (only if city is Bratislava)
  if (/bratislav/i.test(locationText) || /bratislav/i.test(searchCity)) {
    const knownBADistricts = [
      "Staré Mesto", "Ružinov", "Petržalka", "Nové Mesto", "Karlova Ves",
      "Dúbravka", "Rača", "Vrakuňa", "Podunajské Biskupice", "Devínska Nová Ves",
      "Devín", "Lamač", "Záhorská Bystrica", "Čunovo", "Jarovce", "Rusovce"
    ];
    for (const d of knownBADistricts) {
      if (new RegExp(d, "i").test(locationText)) {
        return `Bratislava - ${d}`;
      }
    }
    const baMatch = locationText.match(/Bratislava-([A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽa-záčďéíĺľňóôŕšťúýž\s]+)/i);
    if (baMatch) return `Bratislava - ${baMatch[1].trim()}`;
    return "Bratislava";
  }

  // 4. Other Slovak cities
  if (/žilina|zilina/i.test(locationText) || /žilina|zilina/i.test(searchCity)) {
    if (/vl[cč]ince/i.test(locationText)) return "Žilina - Vlčince";
    if (/hliny/i.test(locationText)) return "Žilina - Hliny";
    if (/solinky/i.test(locationText)) return "Žilina - Solinky";
    return "Žilina";
  }

  if (/nitra/i.test(locationText) || /nitra/i.test(searchCity)) {
    if (/chrenov/i.test(locationText)) return "Nitra - Chrenová";
    if (/kloko[cč]in/i.test(locationText)) return "Nitra - Klokočina";
    if (/zobor/i.test(locationText)) return "Nitra - Zobor";
    return "Nitra";
  }

  if (/bansk[aá]\s*bystric/i.test(locationText) || /bansk[aá]\s*bystric/i.test(searchCity)) {
    if (/s[aá]sov/i.test(locationText)) return "Banská Bystrica - Sásová";
    if (/radva/i.test(locationText)) return "Banská Bystrica - Radvaň";
    if (/fon[cč]ord/i.test(locationText)) return "Banská Bystrica - Fončorda";
    return "Banská Bystrica";
  }

  // Fallback: extract town before 'okres' or use searchCity
  const okresMatch = locationText.match(/,\s*([A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záčďéíĺľňóôŕšťúýž\s]+),\s*okres/i);
  if (okresMatch) return okresMatch[1].trim();

  return formattedSearchCity;
}

/**
 * Intelligent price and utilities extractor for Slovak real estate listings
 */
function parsePrices(headlinePrice: number, fullText: string): {
  baseRent: number;
  utilitiesAmount: number | null;
  isUtilitiesInclusive: boolean;
  totalRentPrice: number;
  priceBreakdownText: string;
} {
  let baseRent = headlinePrice;
  let utilitiesAmount: number | null = null;
  let isUtilitiesInclusive = false;

  // 1. Comprehensive Slovak patterns for separate utilities, services, and fees
  const utilityPatterns = [
    // "+ služby / energie / poplatky / správa (mesačne) :? 120 EUR / €"
    /\+\s*(?:služby|energie|prev[aá]dzk[^: ]*|n[aá]klady|poplatky|spr[aá]va)[^:\d\n]{0,35}[:=-]?\s*([\d\s]+)\s*(?:EUR|€|,-)/i,
    // "+ 120 EUR/€ (/mes / mesačne) energie / služby / poplatky"
    /\+\s*([\d\s]+)\s*(?:EUR|€|,-)?(?:\/mes(?:\.|iac)?)?\s*(?:služby|energie|prev[aá]dzk|poplatk|n[aá]klad|spr[aá]v)/i,
    // "+ 120 EUR/€ ... energie / služby"
    /\+\s*([\d\s]+)\s*(?:EUR|€|,-)[^.\n]*?(?:energie|služby|poplatk)/i,
    // "energie / služby / správa / prevádzkové náklady (mesačne / vo výške) : 120 EUR/€"
    /(?:energie|služby|prev[aá]dzkov[eé]\s*n[aá]klady|poplatky\s*za\s*energie|spr[aá]va)[^:\d\n]{0,35}[:=-]?\s*(?:vo\s*v[yý][sš]ke\s*)?([\d\s]+)\s*(?:EUR|€|,-)/i,
    // "120 EUR/€ za energie / služby"
    /([\d\s]+)\s*(?:EUR|€|,-)?(?:\/mes(?:\.|iac)?)?\s*za\s*(?:energie|služby|prev[aá]dzku|spr[aá]vu)/i,
    // "cena / nájomné 730 € + 120 €"
    /(?:cena|n[aá]jom(?:n[eé])?)\s*[:=-]?\s*[\d\s]+\s*(?:EUR|€)\s*\+\s*([\d\s]+)\s*(?:EUR|€)/i,
    // "+ energie (120 €) or + energie cca 120 €"
    /\+\s*energie[^:\d\n]{0,25}(?:cca|pribli[zž]ne|\()?\s*([\d\s]+)\s*(?:EUR|€)/i,
    // "energie sú / činia 120 €"
    /energie\s*(?:s[uú]|činia|predstavuj[uú])\s*([\d\s]+)\s*(?:EUR|€)/i
  ];

  for (const p of utilityPatterns) {
    const match = fullText.match(p);
    if (match && match[1]) {
      const val = parseInt(match[1].replace(/\s/g, ""), 10);
      if (val >= 25 && val <= 800) {
        utilitiesAmount = val;
        break;
      }
    }
  }

  // 2. Check if text specifies a total price inclusive of utilities
  const incWithTotal = fullText.match(/(?:cena|n[aá]jomn[eé]?)\s*[:=-]?\s*([\d\s]+)\s*(?:EUR|€)[^.\n]*?(?:vr[aá]tane\s*energi[ií]|s\s*energiami)/i);
  if (incWithTotal) {
    const totalWithEnergy = parseInt(incWithTotal[1].replace(/\s/g, ""), 10);
    if (headlinePrice && totalWithEnergy > headlinePrice) {
      utilitiesAmount = totalWithEnergy - headlinePrice;
    } else {
      isUtilitiesInclusive = true;
    }
  }

  // 3. Check for general inclusive indicators
  if (!utilitiesAmount && /(?:vr[aá]tane\s*energi[ií]|s\s*energiami|energie\s*v\s*cene|energie\s*s[uú]\s*zahrnut[eé]|cena\s*je\s*kone[cč]n[aá])/i.test(fullText)) {
    isUtilitiesInclusive = true;
  }

  // Calculate full combined rent price
  const totalRentPrice = baseRent + (utilitiesAmount || 0);

  // Human-readable breakdown text
  let priceBreakdownText = "";
  if (utilitiesAmount) {
    priceBreakdownText = `${baseRent} € nájom + ${utilitiesAmount} € energie`;
  } else if (isUtilitiesInclusive) {
    priceBreakdownText = `Vrátane energií`;
  } else {
    priceBreakdownText = `${baseRent} € (energie neuvedené)`;
  }

  return {
    baseRent,
    utilitiesAmount,
    isUtilitiesInclusive,
    totalRentPrice,
    priceBreakdownText
  };
}

export class NehnutelnostiService {
  /**
   * Builds the search URL for nehnutelnosti.sk
   */
  private static buildUrl(city: string = "bratislava", rooms?: number | null): string {
    const normalizedCity = (city || "bratislava")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    let targetCity = normalizedCity;
    if (["berlin", "prague", "vienna", "central"].includes(targetCity)) {
      targetCity = "bratislava";
    }

    if (rooms && rooms >= 1 && rooms <= 4) {
      return `https://www.nehnutelnosti.sk/vysledky/${rooms}-izbove-byty/${targetCity}/prenajom`;
    } else if (rooms && rooms >= 5) {
      return `https://www.nehnutelnosti.sk/vysledky/5-a-viac-izbove-byty/${targetCity}/prenajom`;
    }

    return `https://www.nehnutelnosti.sk/vysledky/byty/${targetCity}/prenajom`;
  }

  /**
   * Parses listing cards from nehnutelnosti.sk HTML
   */
  public static parseHtml(html: string, searchCity: string = "bratislava"): RawListing[] {
    const adIds = [...html.matchAll(/id="advertisement-([^"]+)"/g)].map(m => m[1]);
    if (!adIds.length) return [];

    const results: RawListing[] = [];
    const seenUrls = new Set<string>();

    for (let i = 0; i < adIds.length; i++) {
      const currentId = adIds[i];
      const nextId = adIds[i + 1];
      const start = html.indexOf(`id="advertisement-${currentId}"`);
      const end = nextId ? html.indexOf(`id="advertisement-${nextId}"`) : start + 15000;
      const chunk = html.substring(start, end);

      const hrefMatch = chunk.match(/href="(https:\/\/www\.nehnutelnosti\.sk\/detail\/[^"]+)"/);
      const detailUrl = hrefMatch ? hrefMatch[1] : `https://www.nehnutelnosti.sk/detail/${currentId}`;

      if (seenUrls.has(detailUrl)) continue;
      seenUrls.add(detailUrl);

      const imgMatch = chunk.match(/src="(https:\/\/img\.unitedclassifieds\.sk\/foto\/[^"]+)"/);
      const photoUrl = imgMatch ? imgMatch[1].replace(/&amp;/g, "&") : null;

      const texts = [...chunk.matchAll(/>([^<]+)</g)]
        .map(m => m[1].trim())
        .filter(t => t.length > 0);

      // Rent headline price
      let headlineRent: number | null = null;
      const priceText = texts.find(t => t.includes("€/mes"));
      if (priceText) {
        const pMatch = priceText.match(/([\d\s]+)\s*€/);
        if (pMatch) headlineRent = parseInt(pMatch[1].replace(/\s/g, ""), 10);
      } else {
        for (const t of texts) {
          const m = t.match(/^([\d\s]+)\s*€$/);
          if (m) {
            headlineRent = parseInt(m[1].replace(/\s/g, ""), 10);
            break;
          }
        }
      }

      if (!headlineRent || headlineRent < 150) continue;

      // Extract utilities & calculate total rent
      const fullText = texts.join(" ");
      const priceData = parsePrices(headlineRent, fullText);

      // Size in m²
      let sizeSqm: number | null = null;
      for (const t of texts) {
        if (/m[²2]/.test(t) && !t.includes("€")) {
          const sMatch = t.match(/([\d.,]+)\s*m[²2]/);
          if (sMatch) {
            sizeSqm = parseFloat(sMatch[1].replace(",", "."));
            break;
          }
        }
      }

      // Rooms
      let rooms: number | null = null;
      const roomsText = texts.find(t => /\b(\d+)\s*izbov/i.test(t));
      if (roomsText) {
        const rMatch = roomsText.match(/(\d+)\s*izbov/i);
        if (rMatch) rooms = parseInt(rMatch[1], 10);
      } else if (texts.some(t => /gars[oó]nka/i.test(t))) {
        rooms = 1;
      }

      // Title & Location (properly handles PREMIUM badges and standard cards)
      let title = "";
      let location = "";

      if (texts[0] === 'PREMIUM' || texts[0] === 'TOP') {
        title = texts.length > 1 ? texts[1] : (texts[0] || "Byt na prenájom");
        location = texts.length > 2 ? texts[2] : searchCity;
      } else {
        title = texts[0] || "Byt na prenájom";
        location = texts.length > 1 ? texts[1] : searchCity;
      }

      // If location happens to be a room or price descriptor, look for actual location text
      if (location.includes("izbov") || location.includes("€") || location.includes("m²") || location.length < 3) {
        const locCandidate = texts.find(t => t.includes("okres") || /,\s*[A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/i.test(t));
        if (locCandidate) {
          location = locCandidate;
        }
      }

      // Filter out sponsored ads from other regions when searching for a specific city
      const normSearch = searchCity.toLowerCase().trim();
      if (normSearch !== "slovensko") {
        const locLower = location.toLowerCase();
        if (normSearch.includes("trnava") && locLower.includes("bratislava") && !locLower.includes("trnava")) {
          continue;
        }
        if (normSearch.includes("bratislava") && !locLower.includes("bratislava") && locLower.includes("okres")) {
          continue;
        }
        if (normSearch.includes("kosic") && !locLower.includes("košic") && !locLower.includes("kosic") && locLower.includes("okres")) {
          continue;
        }
      }

      const district = extractDistrict(location, searchCity);

      // Amenities detection from texts
      const hasParking = /gar[aá]ž|st[aá]tie|parkov/i.test(fullText);
      const hasBalcony = /balk[oó]n|lodž|terasa/i.test(fullText);
      const hasCellar = /pivnic|kobk/i.test(fullText);
      const isFurnished = /zariaden/i.test(fullText);
      const hasAC = /klimatiz/i.test(fullText);

      results.push({
        id: currentId,
        title: title.slice(0, 90),
        location: location.slice(0, 70),
        district,
        totalRentPrice: priceData.totalRentPrice,
        baseRent: priceData.baseRent,
        utilitiesAmount: priceData.utilitiesAmount,
        isUtilitiesInclusive: priceData.isUtilitiesInclusive,
        priceBreakdownText: priceData.priceBreakdownText,
        rentPrice: priceData.totalRentPrice, // default rentPrice is total
        sizeSqm,
        rooms,
        hasParking,
        hasBalcony,
        hasCellar,
        isFurnished,
        hasAC,
        furnishingStatus: isFurnished ? 'furnished' : 'unfurnished',
        sourceAI: 'rules',
        fullText,
        photoUrl,
        detailUrl
      });
    }

    return results;
  }

  /**
   * Fetches rental listings with cache, TypeSafe Jev AI enrichment, and fallback resilience
   */
  public static async getListings(city: string = "bratislava", rooms?: number | null): Promise<RawListing[]> {
    const cacheKey = `${city.toLowerCase()}_${rooms || "all"}`;
    const cached = listingCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const url = this.buildUrl(city, rooms);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "sk,cs;q=0.9,en-US;q=0.8,en;q=0.7"
        },
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const html = await response.text();
        const parsed = this.parseHtml(html, city);

        if (parsed.length > 0) {
          // If TypeSafe Jev AI is configured, enrich the listings with Jev System One decisions
          if (TypeSafeJevService.isConfigured()) {
            await this.enrichWithJev(parsed);
          }

          listingCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
          return parsed;
        }
      }
    } catch (error: any) {
      console.warn(`NehnutelnostiService fetch error for ${url}:`, error.message);
    }

    if (cached) {
      return cached.data;
    }

    const normCity = city.toLowerCase();
    const cityFallbackPool = normCity.includes("trnava")
      ? TRNAVA_FALLBACK_LISTINGS
      : FALLBACK_LISTINGS;

    const filteredFallback = rooms
      ? cityFallbackPool.filter(l => l.rooms === rooms)
      : cityFallbackPool;

    const fallbackToUse = filteredFallback.length > 0 ? [...filteredFallback] : [...cityFallbackPool];

    if (TypeSafeJevService.isConfigured()) {
      await this.enrichWithJev(fallbackToUse);
    }

    return fallbackToUse;
  }

  private static async enrichWithJev(listings: RawListing[]): Promise<void> {
    try {
      const jevMap = await TypeSafeJevService.enrichListings(listings, l => l.fullText || l.title);
      for (const l of listings) {
        const jev = jevMap.get(l.id);
        if (jev) {
          if (jev.hasAC !== undefined) l.hasAC = jev.hasAC;
          if (jev.hasBalcony !== undefined) l.hasBalcony = jev.hasBalcony;
          if (jev.hasParking !== undefined) l.hasParking = jev.hasParking;
          if (jev.hasCellar !== undefined) l.hasCellar = jev.hasCellar;
          if (jev.furnishing) {
            l.furnishingStatus = jev.furnishing;
            l.isFurnished = jev.furnishing !== 'unfurnished';
          }
          if (jev.condition) l.buildingCondition = jev.condition;
          if (jev.utilitiesIncluded !== undefined && !l.utilitiesAmount) {
            l.isUtilitiesInclusive = jev.utilitiesIncluded;
          }
          if (!l.utilitiesAmount && jev.utilitiesAmount) {
            l.utilitiesAmount = jev.utilitiesAmount;
            l.baseRent = l.baseRent || l.rentPrice || 0;
            l.totalRentPrice = l.baseRent + l.utilitiesAmount;
            l.rentPrice = l.totalRentPrice;
            l.priceBreakdownText = `${l.baseRent} € nájom + ${l.utilitiesAmount} € energie`;
            l.isUtilitiesInclusive = false;
          }
          l.sourceAI = 'jev';
        }
      }
    } catch (err: any) {
      console.warn('TypeSafe Jev enrichment error:', err.message);
    }
  }
}
