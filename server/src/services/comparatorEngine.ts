import { RawListing } from './nehnutelnostiService';

export interface TargetPropertyCriteria {
  id?: string;
  name?: string;
  unitNumber?: string;
  sizeSqm: number;
  bedrooms: number;
  bathrooms?: number;
  rentAmount: number;
  baseRent?: number | null;
  utilitiesAmount?: number | null;
  city: string;
  neighborhood?: string;
  hasParking?: boolean;
  hasCellar?: boolean;
  hasAC?: boolean;
  hasBalcony?: boolean;
  furnishingStatus?: 'furnished' | 'partially' | 'unfurnished';
  buildingCondition?: 'new_building' | 'reconstructed' | 'original';
}

export interface MatchBreakdown {
  roomsScore: number;
  roomsMax: number;
  roomsLabel: string;
  sizeScore: number;
  sizeMax: number;
  sizeLabel: string;
  locationScore: number;
  locationMax: number;
  locationLabel: string;
  amenitiesScore: number;
  amenitiesMax: number;
  amenitiesLabel: string;
}

export interface ComparableListing extends RawListing {
  confidenceScore: number; // 0 to 100%
  confidenceTier: 'high' | 'good' | 'moderate';
  pricePerSqm: number | null;
  deltaAmount: number; // Difference compared to our property's rent
  deltaPercent: number;
  breakdown: MatchBreakdown;
}

export interface MarketSummaryStats {
  comparablesCount: number;
  hasJevAI?: boolean;
  medianRent: number;
  avgRent: number;
  avgRentPerSqm: number;
  minRent: number;
  maxRent: number;
  targetCurrentRent: number;
  targetEstimatedMarketRent: number;
  estimatedBaseRent?: number;
  estimatedUtilities?: number;
  deltaMarketRent: number;
  deltaMarketPercent: number;
  avgConfidenceScore?: number;
  recommendation: string;
}

export interface MarketComparisonResult {
  target: TargetPropertyCriteria;
  stats: MarketSummaryStats;
  comparables: ComparableListing[];
}

export class ComparatorEngine {
  /**
   * Evaluates how similar an external listing is to the target property
   */
  public static evaluateListing(
    comp: RawListing,
    target: TargetPropertyCriteria
  ): { confidenceScore: number; breakdown: MatchBreakdown } {
    // 1. Rooms Score (Max: 25)
    let roomsScore = 0;
    let roomsLabel = "";
    const targetRooms = target.bedrooms || 1;

    if (comp.rooms === targetRooms) {
      roomsScore = 25;
      roomsLabel = `Presná zhoda (${comp.rooms} izby)`;
    } else if (comp.rooms && Math.abs(comp.rooms - targetRooms) === 1) {
      roomsScore = 14;
      roomsLabel = `Blízky počet izieb (${comp.rooms} vs ${targetRooms})`;
    } else if (!comp.rooms) {
      roomsScore = 10;
      roomsLabel = `Počet izieb neuvedený`;
    } else {
      roomsScore = 2;
      roomsLabel = `Odlišný počet izieb (${comp.rooms} vs ${targetRooms})`;
    }

    // 2. Size / Area Score (Max: 30)
    let sizeScore = 0;
    let sizeLabel = "";
    if (comp.sizeSqm && target.sizeSqm > 0) {
      const diffRatio = Math.abs(comp.sizeSqm - target.sizeSqm) / target.sizeSqm;
      const diffSqm = Math.abs(comp.sizeSqm - target.sizeSqm).toFixed(1);

      if (diffRatio <= 0.05) {
        sizeScore = 30;
        sizeLabel = `Výborná zhoda plochy (±${diffSqm} m²)`;
      } else if (diffRatio <= 0.12) {
        sizeScore = 25;
        sizeLabel = `Veľmi podobná výmera (±${diffSqm} m²)`;
      } else if (diffRatio <= 0.25) {
        sizeScore = 18;
        sizeLabel = `Podobná plocha (±${diffSqm} m²)`;
      } else if (diffRatio <= 0.40) {
        sizeScore = 10;
        sizeLabel = `Rozdiel v rozlohe (${diffSqm} m²)`;
      } else {
        sizeScore = Math.max(2, Math.round(30 * (1 - Math.min(diffRatio, 1))));
        sizeLabel = `Výrazne odlišná plocha (${comp.sizeSqm} m² vs ${target.sizeSqm} m²)`;
      }
    } else {
      sizeScore = 15;
      sizeLabel = `Plocha neuvedená`;
    }

    // 3. Location / District Score (Max: 25)
    let locationScore = 0;
    let locationLabel = "";
    const targetNeighborhood = (target.neighborhood || "").toLowerCase().trim();
    const targetCity = (target.city || "trnava").toLowerCase().trim();
    const compLocationLower = (comp.location || "").toLowerCase();
    const compDistrictLower = (comp.district || "").toLowerCase();

    const targetNameLower = (target.name || "").toLowerCase();
    const targetAddressLower = (target.name || "").toLowerCase() + " " + (target.id || "");

    // Check district/quarter/project matching (e.g. Arboria, Cukrovar, Ružinov, Staré Mesto, Veterná)
    const knownZones = ["arboria", "cukrovar", "hliny", "družba", "prednádražie", "kopánka", "linčianska", "ružinov", "staré mesto", "petržalka", "nové mesto", "dúbravka", "karlova ves", "kollwitz", "spreeufer"];
    const matchedZone = knownZones.find(z => 
      (targetNeighborhood.includes(z) || targetNameLower.includes(z) || (comp.district || "").toLowerCase().includes(z)) &&
      (compLocationLower.includes(z) || compDistrictLower.includes(z))
    );

    const districtMatch =
      Boolean(matchedZone) ||
      (targetNeighborhood &&
      targetNeighborhood !== "central" &&
      (compLocationLower.includes(targetNeighborhood) ||
        compDistrictLower.includes(targetNeighborhood) ||
        targetNeighborhood.includes(compDistrictLower)));

    // Check city matching
    const cityMatch =
      compLocationLower.includes(targetCity) ||
      compDistrictLower.includes(targetCity);

    if (districtMatch) {
      locationScore = 25;
      locationLabel = `Rovnaká zóna (${comp.district || target.neighborhood})`;
    } else if (cityMatch) {
      locationScore = 20;
      locationLabel = `Rovnaké mesto (${comp.district || target.city})`;
    } else if (targetCity.includes("berlin") || targetCity.includes("central")) {
      locationScore = 15;
      locationLabel = `Slovenský trh (${comp.district || comp.location})`;
    } else {
      locationScore = 6;
      locationLabel = `Iná lokalita (${comp.district || comp.location})`;
    }

    // 4. Amenities & Quality Score (Max: 20)
    let amenitiesScore = 0;
    const matchedFeatures: string[] = [];

    // Parking (Max: 5)
    if (target.hasParking && comp.hasParking) {
      amenitiesScore += 5;
      matchedFeatures.push("parkovanie");
    } else if (!target.hasParking && !comp.hasParking) {
      amenitiesScore += 3;
    } else {
      amenitiesScore += 1;
    }

    // Cellar / Kobka (Max: 4) - kobka aj pivnica sa rátajú ako to isté
    if (target.hasCellar && comp.hasCellar) {
      amenitiesScore += 4;
      matchedFeatures.push("kobka/pivnica");
    } else if (!target.hasCellar && !comp.hasCellar) {
      amenitiesScore += 2;
    } else {
      amenitiesScore += 1;
    }

    // Balcony / Terrace (Max: 4)
    if (comp.hasBalcony) {
      amenitiesScore += 4;
      matchedFeatures.push("balkón/loggia");
    } else {
      amenitiesScore += 1;
    }

    // AC / Klimatizácia (Max: 4)
    if (target.hasAC && comp.hasAC) {
      amenitiesScore += 4;
      matchedFeatures.push("klimatizácia");
    } else if (!target.hasAC && !comp.hasAC) {
      amenitiesScore += 3;
    } else if (comp.hasAC) {
      amenitiesScore += 2;
    } else {
      amenitiesScore += 1;
    }

    // Furnishing & Building Condition Alignment (Max: 3)
    let conditionBonus = 0;
    const targetFurnished = target.furnishingStatus !== 'unfurnished';
    const compFurnished = comp.furnishingStatus === 'furnished' || comp.isFurnished;

    if (targetFurnished && compFurnished) {
      conditionBonus += 2;
      matchedFeatures.push("zariadený");
    } else if (!targetFurnished && comp.furnishingStatus === 'unfurnished') {
      conditionBonus += 2;
      matchedFeatures.push("nezariadený");
    } else if (comp.furnishingStatus === 'partially') {
      conditionBonus += 1;
    }

    if (comp.buildingCondition === 'new_building') {
      conditionBonus += 1;
      matchedFeatures.push("novostavba");
    }
    amenitiesScore += Math.min(3, conditionBonus);

    amenitiesScore = Math.min(20, amenitiesScore);
    const amenitiesLabel =
      matchedFeatures.length > 0
        ? `Zhodné benefity: ${matchedFeatures.join(", ")}`
        : `Základné vybavenie`;

    // Total confidence
    const totalScore = Math.min(100, Math.max(15, roomsScore + sizeScore + locationScore + amenitiesScore));

    return {
      confidenceScore: totalScore,
      breakdown: {
        roomsScore,
        roomsMax: 25,
        roomsLabel,
        sizeScore,
        sizeMax: 30,
        sizeLabel,
        locationScore,
        locationMax: 25,
        locationLabel,
        amenitiesScore,
        amenitiesMax: 20,
        amenitiesLabel
      }
    };
  }

  /**
   * Compares the target property against all raw listings and generates market statistics
   */
  public static compare(
    target: TargetPropertyCriteria,
    listings: RawListing[]
  ): MarketComparisonResult {
    const scoredListings: ComparableListing[] = listings.map(l => {
      const { confidenceScore, breakdown } = this.evaluateListing(l, target);
      const pricePerSqm =
        l.rentPrice && l.sizeSqm ? Number((l.rentPrice / l.sizeSqm).toFixed(2)) : null;

      const deltaAmount = l.rentPrice ? l.rentPrice - target.rentAmount : 0;
      const deltaPercent = target.rentAmount > 0
        ? Number((((l.rentPrice || 0) - target.rentAmount) / target.rentAmount * 100).toFixed(1))
        : 0;

      let confidenceTier: 'high' | 'good' | 'moderate' = 'moderate';
      if (confidenceScore >= 80) confidenceTier = 'high';
      else if (confidenceScore >= 60) confidenceTier = 'good';

      return {
        ...l,
        confidenceScore,
        confidenceTier,
        pricePerSqm,
        deltaAmount,
        deltaPercent,
        breakdown
      };
    });

    // Sort descending by confidence score
    scoredListings.sort((a, b) => b.confidenceScore - a.confidenceScore);

    // Compute market stats using top 10 most relevant matches
    let topComps = scoredListings.slice(0, 10).filter(c => c.rentPrice && c.rentPrice > 0);

    // Outlier filtering: exclude extreme prices > 40% away from the median if sample size >= 5
    if (topComps.length >= 5) {
      const rawPrices = topComps.map(c => c.rentPrice as number).sort((a, b) => a - b);
      const rawMedian = rawPrices[Math.floor(rawPrices.length / 2)];
      const filtered = topComps.filter(c => {
        const diff = Math.abs((c.rentPrice as number) - rawMedian) / rawMedian;
        return diff <= 0.38; // filter out luxury penthouse or extreme anomalies
      });
      if (filtered.length >= 3) {
        topComps = filtered;
      }
    }

    const prices = topComps.map(c => c.rentPrice as number).sort((a, b) => a - b);

    const comparablesCount = scoredListings.length;
    let medianRent = 0;
    let avgRent = 0;
    let avgRentPerSqm = 0;
    let minRent = 0;
    let maxRent = 0;

    if (prices.length > 0) {
      minRent = prices[0];
      maxRent = prices[prices.length - 1];

      // Confidence-weighted average rent
      const totalWeight = topComps.reduce((acc, c) => acc + (c.confidenceScore || 50), 0);
      const weightedRentSum = topComps.reduce((acc, c) => acc + ((c.rentPrice as number) * (c.confidenceScore || 50)), 0);
      avgRent = totalWeight > 0 ? Math.round(weightedRentSum / totalWeight) : Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

      const mid = Math.floor(prices.length / 2);
      medianRent = prices.length % 2 !== 0 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2);

      // Confidence-weighted average €/m²
      const compsWithSqm = topComps.filter(c => c.pricePerSqm && c.pricePerSqm > 0);
      if (compsWithSqm.length > 0) {
        const sqmWeightSum = compsWithSqm.reduce((acc, c) => acc + (c.confidenceScore || 50), 0);
        const weightedSqmSum = compsWithSqm.reduce((acc, c) => acc + ((c.pricePerSqm as number) * (c.confidenceScore || 50)), 0);
        avgRentPerSqm = sqmWeightSum > 0 ? Number((weightedSqmSum / sqmWeightSum).toFixed(2)) : Number((compsWithSqm.reduce((a, c) => a + (c.pricePerSqm as number), 0) / compsWithSqm.length).toFixed(2));
      } else {
        avgRentPerSqm = target.sizeSqm > 0 ? Number((avgRent / target.sizeSqm).toFixed(2)) : 0;
      }
    }

    // Confidence-weighted estimated market rent
    // Prioritizes highly matching listings (rooms, area, zone, amenities)
    const targetEstimatedMarketRent =
      avgRentPerSqm > 0 && target.sizeSqm > 0
        ? Math.round(avgRentPerSqm * target.sizeSqm)
        : avgRent || medianRent || 0;

    const avgConfidenceScore = topComps.length > 0
      ? Math.round(topComps.reduce((acc, c) => acc + (c.confidenceScore || 0), 0) / topComps.length)
      : 0;

    // Calculate base rent vs utilities breakdown from comparables
    const compsWithBase = topComps.filter(c => c.baseRent && c.baseRent > 0 && c.baseRent < (c.totalRentPrice || c.rentPrice));
    let estimatedUtilities = 150; // standard 2-room apartment utilities
    if (compsWithBase.length > 0) {
      const avgUtils = compsWithBase.reduce((acc, c) => acc + ((c.totalRentPrice || c.rentPrice) - c.baseRent), 0) / compsWithBase.length;
      estimatedUtilities = Math.round(avgUtils);
    } else if (target.utilitiesAmount && target.utilitiesAmount > 0) {
      estimatedUtilities = Number(target.utilitiesAmount);
    }
    const estimatedBaseRent = Math.max(300, targetEstimatedMarketRent - estimatedUtilities);

    const hasCurrentRent = target.rentAmount && target.rentAmount > 0;
    const deltaMarketRent = hasCurrentRent ? target.rentAmount - targetEstimatedMarketRent : 0;
    const deltaMarketPercent =
      hasCurrentRent && targetEstimatedMarketRent > 0
        ? Number(((deltaMarketRent / targetEstimatedMarketRent) * 100).toFixed(1))
        : 0;

    // Strategy recommendation
    let recommendation = "";
    if (!hasCurrentRent) {
      recommendation = `Byt momentálne nemá aktívnu zmluvu. Na základe trhovej analýzy v lokalite ${target.city} odporúčame nastaviť uvádzací čistý nájom na cca ${estimatedBaseRent} € + ${estimatedUtilities} € energie (celkovo cca ${targetEstimatedMarketRent} €/mes.).`;
    } else if (deltaMarketPercent < -7) {
      recommendation = `Váš nájom (${target.rentAmount} €) je pod trhovým priemerom. Pri obnove zmluvy máte priestor na zvýšenie o +${Math.abs(deltaMarketRent)} €/mes.`;
    } else if (deltaMarketPercent > 7) {
      recommendation = `Váš nájom (${target.rentAmount} €) je o +${deltaMarketPercent} % vyšší než porovnateľné byty. Zamerajte sa na udržanie spokojnosti nájomcu.`;
    } else {
      recommendation = `Váš nájom presne zodpovedá aktuálnej trhovej hodnote porovnateľných bytov (odchýlka len ${deltaMarketPercent}%). Odporúčame bežnú inflačnú indexáciu.`;
    }

    const hasJevAI = scoredListings.some(l => l.sourceAI === 'jev');

    return {
      target,
      stats: {
        comparablesCount,
        hasJevAI,
        medianRent,
        avgRent,
        avgRentPerSqm,
        minRent,
        maxRent,
        targetCurrentRent: target.rentAmount,
        targetEstimatedMarketRent,
        estimatedBaseRent,
        estimatedUtilities,
        deltaMarketRent,
        deltaMarketPercent,
        avgConfidenceScore,
        recommendation
      },
      comparables: scoredListings
    };
  }
}
