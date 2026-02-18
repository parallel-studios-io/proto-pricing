/**
 * Country-aware Name & Contact Generators
 * Generates company names, personal names, emails, domains, cities, and phone numbers
 * based on the country of the company profile.
 */

// ─── Name Pools ──────────────────────────────────────────────────────────────

const NAME_POOLS: Record<
  string,
  {
    firstNames: string[];
    lastNames: string[];
    companyPrefixes: string[];
    companyCores: string[];
    companySuffixes: string[];
    cities: string[];
    domainTld: string;
    phonePrefix: string;
    phoneFormat: () => string;
  }
> = {
  Netherlands: {
    firstNames: [
      "Jan", "Pieter", "Kees", "Willem", "Johan",
      "Anna", "Maria", "Sophie", "Emma", "Lisa",
      "Mark", "Thomas", "David", "Bram", "Daan",
      "Sanne", "Fleur", "Eva", "Lotte", "Julia",
    ],
    lastNames: [
      "de Vries", "Jansen", "de Boer", "van Dijk", "Bakker",
      "Visser", "Smit", "Meijer", "de Groot", "Mulder",
      "Bos", "Peters", "Hendriks", "van Leeuwen", "Dekker",
      "van den Berg", "Willems", "de Jong", "Vermeer", "Kuijpers",
    ],
    companyPrefixes: [
      "Dutch", "Euro", "Global", "Quick", "Fast",
      "Smart", "Green", "Blue", "Red", "Prime",
      "Noord", "Zuid", "West", "Oud", "Nieuw",
    ],
    companyCores: [
      "Shop", "Store", "Trade", "Commerce", "Market",
      "Retail", "Goods", "Products", "Sales", "Direct",
      "Handel", "Winkel", "Markt", "Verzending", "Logistiek",
    ],
    companySuffixes: ["BV", "NL", "EU", "Online", "Express", "Plus", "Pro", ""],
    cities: [
      "Amsterdam", "Rotterdam", "Utrecht", "Den Haag", "Eindhoven",
      "Groningen", "Tilburg", "Almere", "Breda", "Nijmegen",
      "Leiden", "Haarlem", "Arnhem", "Maastricht", "Delft",
    ],
    domainTld: ".nl",
    phonePrefix: "+31",
    phoneFormat: () =>
      `+31 ${randomInRange(10, 99)} ${randomInRange(100, 999)} ${randomInRange(1000, 9999)}`,
  },
  "United States": {
    firstNames: [
      "James", "Sarah", "Michael", "Emily", "Robert",
      "Jessica", "David", "Ashley", "William", "Jennifer",
      "Christopher", "Amanda", "Matthew", "Stephanie", "Daniel",
      "Nicole", "Andrew", "Rachel", "Joshua", "Lauren",
    ],
    lastNames: [
      "Smith", "Johnson", "Williams", "Brown", "Jones",
      "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
      "Wilson", "Anderson", "Taylor", "Thomas", "Moore",
      "Jackson", "Martin", "Lee", "Thompson", "White",
    ],
    companyPrefixes: [
      "American", "Global", "Pacific", "Summit", "Apex",
      "Swift", "Bright", "Peak", "Core", "Atlas",
      "Eagle", "Liberty", "Prime", "Quantum", "Nexus",
    ],
    companyCores: [
      "Shop", "Store", "Commerce", "Market", "Retail",
      "Goods", "Products", "Sales", "Direct", "Supply",
      "Trade", "Hub", "Solutions", "Works", "Lab",
    ],
    companySuffixes: ["Inc", "LLC", "Co", "US", "Online", "Express", "Plus", ""],
    cities: [
      "San Francisco", "New York", "Los Angeles", "Chicago", "Austin",
      "Seattle", "Denver", "Boston", "Miami", "Portland",
      "Nashville", "Atlanta", "Dallas", "Phoenix", "Minneapolis",
    ],
    domainTld: ".com",
    phonePrefix: "+1",
    phoneFormat: () =>
      `+1 (${randomInRange(200, 999)}) ${randomInRange(200, 999)}-${randomInRange(1000, 9999)}`,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randomInRange(0, arr.length - 1)];
}

function getPool(country: string) {
  return NAME_POOLS[country] || NAME_POOLS["United States"];
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function generateCompanyName(country: string): string {
  const pool = getPool(country);
  const prefix = pick(pool.companyPrefixes);
  const core = pick(pool.companyCores);
  const suffix = pick(pool.companySuffixes);
  return `${prefix} ${core}${suffix ? " " + suffix : ""}`;
}

export function generateFirstName(country: string): string {
  return pick(getPool(country).firstNames);
}

export function generateLastName(country: string): string {
  return pick(getPool(country).lastNames);
}

export function generateDomain(companyName: string, country: string): string {
  const pool = getPool(country);
  const sanitized = companyName
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
  return `${sanitized}${pool.domainTld}`;
}

export function generateEmail(companyName: string, country: string): string {
  const domain = generateDomain(companyName, country);
  return `billing@${domain}`;
}

export function generateCity(country: string): string {
  return pick(getPool(country).cities);
}

export function generatePhoneNumber(country: string): string {
  return getPool(country).phoneFormat();
}

/**
 * Returns the TLD for a given country (e.g. ".nl" for Netherlands, ".com" for US).
 * Useful for constructing domains externally.
 */
export function getDomainTld(country: string): string {
  return getPool(country).domainTld;
}
