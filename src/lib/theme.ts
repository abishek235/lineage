export const THEME_IDS = ["sage", "rose", "mist", "dusk"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_LABELS: Record<ThemeId, string> = {
  sage: "Ela, banana leaf",
  rose: "Kumkumam",
  mist: "Neelam, indigo",
  dusk: "Temple dusk",
};

export const THEME_SWATCH: Record<ThemeId, string> = {
  sage: "bg-swatch-sage",
  rose: "bg-swatch-rose",
  mist: "bg-swatch-mist",
  dusk: "bg-swatch-dusk",
};

export const MODE_IDS = ["light", "dark"] as const;

export type ModeId = (typeof MODE_IDS)[number];

export function isTheme(value: string | undefined): value is ThemeId {
  return THEME_IDS.includes(value as ThemeId);
}

export function isMode(value: string | undefined): value is ModeId {
  return value === "light" || value === "dark";
}

export const THEME_STORAGE_KEY = "lineage-theme";
export const MODE_STORAGE_KEY = "lineage-mode";

export const THEME_BOOT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var themes=["sage","rose","mist","dusk"];if(themes.indexOf(t)<0)t="sage";document.documentElement.setAttribute("data-theme",t);var mode=localStorage.getItem("${MODE_STORAGE_KEY}");if(mode!=="dark"&&mode!=="light"){mode=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-mode",mode);document.documentElement.style.colorScheme=mode;var canvas=getComputedStyle(document.documentElement).getPropertyValue("--canvas").trim();var m=document.querySelector('meta[name="theme-color"]');if(m&&canvas)m.setAttribute("content",canvas);}catch(e){}})();`;

function syncChrome() {
  const canvas = getComputedStyle(document.documentElement).getPropertyValue("--canvas").trim();
  if (canvas) {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", canvas);
  }
}

export function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id;
  localStorage.setItem(THEME_STORAGE_KEY, id);
  syncChrome();
}

export function applyMode(mode: ModeId) {
  document.documentElement.dataset.mode = mode;
  document.documentElement.style.colorScheme = mode;
  localStorage.setItem(MODE_STORAGE_KEY, mode);
  syncChrome();
}
