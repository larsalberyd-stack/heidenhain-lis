// Decision-maker title classification for Heidenhain encoders/CNC sales.
// Refined 2026-04-24 after Per Wincent feedback: Quality/Production/Operations
// are NOT relevant — Per wants pure R&D/Design/Engineering/Tech leadership.

// Titles that DISQUALIFY a contact even if they contain a tech keyword.
// Example: "Production Engineering Manager" matches "engineering manager" but is
// excluded because of "production". Per: "inte Quality, Production eller Operations".
const EXCLUDE_KEYWORDS = [
  "quality", "qa ", "qa,", "qa/",
  "production", "manufacturing",
  "operations", "operativ",
  "service", "after sales", "aftermarket",
  "supply chain", "logistics", "warehouse",
  "marketing", "communication", "kommunikation",
  "hr ", "human resources", "people ",
  "finance", "accounting", "controller", "cfo",
  "legal", "compliance",
  "facility", "facilities",
];

const TECH_KEYWORDS = [
  "cto", "chief technology", "chief technical",
  "vp technology", "vp r&d", "vp engineering", "vp product",
  "head of r&d", "head of engineering", "head of product", "head of design",
  "director engineering", "director r&d", "director, r&d", "director, engineering",
  "director of engineering", "director of r&d",
  "engineering manager", "r&d manager", "rd manager",
  "design manager", "technical manager",
  "lead engineer", "system architect", "principal engineer",
  "innovation manager", "product manager",
];

const PROCUREMENT_KEYWORDS = [
  "cpo", "chief procurement", "chief purchasing",
  "vp procurement", "vp purchasing",
  "head of procurement", "head of purchasing",
  "director procurement", "director purchasing",
  "purchasing manager", "procurement manager",
  "category manager", "strategic sourcing",
];

export type DecisionMakerCategory = "tech" | "procurement" | null;

function isExcluded(title: string): boolean {
  return EXCLUDE_KEYWORDS.some(k => title.includes(k));
}

export function classifyTitle(title: string | null | undefined): DecisionMakerCategory {
  if (!title) return null;
  const t = title.toLowerCase();
  if (isExcluded(t)) return null;
  if (TECH_KEYWORDS.some(k => t.includes(k))) return "tech";
  if (PROCUREMENT_KEYWORDS.some(k => t.includes(k))) return "procurement";
  return null;
}

export function isDecisionMaker(title: string | null | undefined): boolean {
  return classifyTitle(title) !== null;
}

export const decisionMakerLabels: Record<NonNullable<DecisionMakerCategory>, { label: string; color: string }> = {
  tech: { label: "Tech-beslutsfattare", color: "bg-blue-100 text-blue-700 border-blue-200" },
  procurement: { label: "Inköp", color: "bg-amber-100 text-amber-700 border-amber-200" },
};
