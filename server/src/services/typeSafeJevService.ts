import path from 'path';
import dotenv from 'dotenv';

export interface JevExtractionResult {
  hasAC?: boolean;
  hasBalcony?: boolean;
  hasParking?: boolean;
  hasCellar?: boolean;
  furnishing?: 'furnished' | 'partially' | 'unfurnished';
  utilitiesIncluded?: boolean;
  utilitiesAmount?: number;
  condition?: 'new_building' | 'reconstructed' | 'original';
  confidenceScores?: {
    hasAC?: number;
    hasBalcony?: number;
    hasParking?: number;
    hasCellar?: number;
    furnishingConfidence?: number;
    utilitiesIncludedConfidence?: number;
  };
}

const jevCache = new Map<string, JevExtractionResult>();

export class TypeSafeJevService {
  private static lastRejectedKey: string | null = null;

  private static get apiKey(): string | undefined {
    // Reload env dynamically so edits to .env take effect immediately
    dotenv.config();
    dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });

    const raw = process.env.TYPESAFE_API_KEY?.trim();
    if (!raw) return undefined;
    return raw.replace(/^["']|["']$/g, '').trim();
  }

  private static get apiUrl(): string {
    return process.env.TYPESAFE_API_URL?.trim() || 'https://api.typesafe.ai/v1/systemone';
  }

  private static get model(): string {
    return process.env.TYPESAFE_MODEL?.trim() || 'jev-latest';
  }

  /**
   * Checks if TypeSafe Jev AI is configured and ready
   */
  public static isConfigured(): boolean {
    const key = this.apiKey;
    if (!key || key.length < 6) return false;
    // Circuit breaker: skip if this key was already rejected by the server
    if (this.lastRejectedKey === key) return false;
    return true;
  }

  /**
   * Intelligently extracts apartment attributes and nuances using TypeSafe AI's Jev model
   */
  public static async analyzeListing(
    listingId: string,
    listingText: string
  ): Promise<JevExtractionResult | null> {
    if (!this.isConfigured()) {
      return null;
    }

    // Check in-memory cache first
    if (jevCache.has(listingId)) {
      return jevCache.get(listingId)!;
    }

    const cleanText = listingText.slice(0, 4000);
    if (cleanText.length < 30) {
      return null;
    }

    try {
      const payload = {
        model: this.model,
        state: cleanText,
        questions: {
          has_ac: {
            type: 'noul',
            instructions: 'Does this apartment have air conditioning (klimatizácia)?'
          },
          has_balcony: {
            type: 'noul',
            instructions: 'Does this apartment have a balcony, loggia, or terrace (balkón, lodžia, terasa)?'
          },
          has_parking: {
            type: 'noul',
            instructions: 'Is a parking spot or garage included or available with the apartment (garáž, parkovacie státie)?'
          },
          has_cellar: {
            type: 'noul',
            instructions: 'Does the apartment include a cellar, storage space or cubicle (pivnica, kobka)?'
          },
          furnishing: {
            type: 'choice',
            instructions: 'How is the apartment furnished?',
            criteria: {
              furnished: 'Fully furnished with furniture and appliances (kompletne zariadený)',
              partially: 'Partially furnished, kitchen only or essential items (čiastočne zariadený)',
              unfurnished: 'Unfurnished without furniture (nezariadený)'
            }
          },
          utilities_included: {
            type: 'noul',
            instructions: 'Are utilities (energie, služby) already included in the stated rent price or are they an extra fee?'
          },
          utilities_amount_bracket: {
            type: 'choice',
            instructions: 'What is the amount of separate monthly utilities, energy or service charges (energie, služby) listed in the text?',
            criteria: {
              included_or_none: 'Utilities are included in rent, not specified, or zero',
              fee_around_100: 'Around 80 to 110 EUR (e.g. +100€ energie)',
              fee_around_120: 'Around 115 to 135 EUR (e.g. +120€ energie, +130€ energie)',
              fee_around_150: 'Around 140 to 170 EUR (e.g. +150€ energie)',
              fee_around_200: 'Around 180 to 220 EUR (e.g. +200€ energie)',
              fee_over_220: 'Over 220 EUR (e.g. +250€ energie or higher)'
            }
          },
          condition: {
            type: 'choice',
            instructions: 'What is the condition of the apartment or building?',
            criteria: {
              new_building: 'New building (novostavba) or recently completed development',
              reconstructed: 'Complete reconstruction or renovated flat (rekonštrukcia)',
              original: 'Original condition (pôvodný stav) or older flat'
            }
          }
        }
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.lastRejectedKey = this.apiKey || null;
          console.warn(`TypeSafe Jev API returned 401 (Unauthorized). Disabling further requests until API key is updated in .env.`);
        } else {
          console.warn(`TypeSafe Jev API returned status ${response.status}`);
        }
        return null;
      }

      const data = await response.json();
      const answers = data.answers || {};

      let jevUtilitiesAmount: number | undefined;
      if (answers.utilities_amount_bracket) {
        switch (answers.utilities_amount_bracket.choice) {
          case 'fee_around_100': jevUtilitiesAmount = 100; break;
          case 'fee_around_120': jevUtilitiesAmount = 120; break;
          case 'fee_around_150': jevUtilitiesAmount = 150; break;
          case 'fee_around_200': jevUtilitiesAmount = 200; break;
          case 'fee_over_220': jevUtilitiesAmount = 250; break;
        }
      }

      const result: JevExtractionResult = {
        hasAC: answers.has_ac ? answers.has_ac.probability >= 0.55 : undefined,
        hasBalcony: answers.has_balcony ? answers.has_balcony.probability >= 0.55 : undefined,
        hasParking: answers.has_parking ? answers.has_parking.probability >= 0.55 : undefined,
        hasCellar: answers.has_cellar ? answers.has_cellar.probability >= 0.55 : undefined,
        furnishing: answers.furnishing ? (answers.furnishing.choice as any) : undefined,
        utilitiesIncluded: answers.utilities_included ? answers.utilities_included.probability >= 0.65 : undefined,
        utilitiesAmount: jevUtilitiesAmount,
        condition: answers.condition ? (answers.condition.choice as any) : undefined,
        confidenceScores: {
          hasAC: answers.has_ac?.probability,
          hasBalcony: answers.has_balcony?.probability,
          hasParking: answers.has_parking?.probability,
          hasCellar: answers.has_cellar?.probability,
          furnishingConfidence: answers.furnishing?.confidence,
          utilitiesIncludedConfidence: answers.utilities_included?.probability
        }
      };

      jevCache.set(listingId, result);
      return result;
    } catch (err: any) {
      console.warn('TypeSafe Jev extraction warning:', err.message);
      return null;
    }
  }

  /**
   * Batch analyzes multiple listings with concurrency limit
   */
  public static async enrichListings<T extends { id: string; fullText?: string }>(
    listings: T[],
    getText: (item: T) => string
  ): Promise<Map<string, JevExtractionResult>> {
    const resultMap = new Map<string, JevExtractionResult>();
    if (!this.isConfigured()) {
      return resultMap;
    }

    const promises = listings.slice(0, 15).map(async item => {
      const text = getText(item);
      const res = await this.analyzeListing(item.id, text);
      if (res) {
        resultMap.set(item.id, res);
      }
    });

    await Promise.allSettled(promises);
    return resultMap;
  }
}
