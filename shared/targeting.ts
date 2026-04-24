// Decision-maker title classification.
// PLACEHOLDER list — replace with Per Wincent's official targeting rules
// (action item from 2026-04-24 review meeting).

const TECH_KEYWORDS = [
  "cto", "chief technology", "chief technical",
  "vp technology", "vp r&d", "vp engineering", "vp product",
  "head of r&d", "head of engineering", "head of product",
  "director engineering", "director r&d", "director, r&d", "director, engineering",
  "engineering manager", "r&d manager", "rd manager",
  "design manager", "technical manager",
  "lead engineer", "system architect", "principal engineer",
  "innovation manager",
];

const PROCUREMENT_KEYWORDS = [
  "cpo", "chief procurement", "chief purchasing",
  "vp procurement", "vp purchasing", "vp supply chain",
  "head of procurement", "head of purchasing", "head of supply chain",
  "director procurement", "director purchasing", "director supply chain",
  "purchasing manager", "procurement manager", "supply chain manager",
  "category manager", "supplier quality manager",
];

const EXEC_KEYWORDS = [
  "ceo", "chief executive", "managing director", "general manager",
  "coo", "chief operating",
];

export type DecisionMakerCategory = "tech" | "procurement" | "exec" | null;

export function classifyTitle(title: string | null | undefined): DecisionMakerCategory {
  if (!title) return null;
  const t = title.toLowerCase();
  if (TECH_KEYWORDS.some(k => t.includes(k))) return "tech";
  if (PROCUREMENT_KEYWORDS.some(k => t.includes(k))) return "procurement";
  if (EXEC_KEYWORDS.some(k => t.includes(k))) return "exec";
  return null;
}

export function isDecisionMaker(title: string | null | undefined): boolean {
  return classifyTitle(title) !== null;
}

export const decisionMakerLabels: Record<NonNullable<DecisionMakerCategory>, { label: string; color: string }> = {
  tech: { label: "Tech-beslutsfattare", color: "bg-blue-100 text-blue-700 border-blue-200" },
  procurement: { label: "Inköp", color: "bg-amber-100 text-amber-700 border-amber-200" },
  exec: { label: "Ledning", color: "bg-purple-100 text-purple-700 border-purple-200" },
};
