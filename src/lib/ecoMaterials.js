export const ECO_MATERIALS = [
  {
    value: "allpha_bone",
    label: "allPHA Bone",
    family: "PHA Biopolymer",
    finish: "Warm chalk matte",
    summary: "Bone-white biodegradable biopolymer with a soft chalky finish.",
    source: "colorFabb allPHA",
    url: "https://colorfabb.com/filaments/materials/pha-filaments/allpha",
    baseColor: "#efe6da",
    tintColor: "#d8cab8",
    lineColor: "#c9baa7",
    roughness: 0.96,
    metalness: 0.01,
    clearcoat: 0.02,
    reflectivity: 0.14,
    texture: "chalk"
  },
  {
    value: "rpla_eggshell",
    label: "rPLA Eggshell",
    family: "Recycled PLA",
    finish: "Semi-matte oat",
    summary: "Recycled PLA with a soft eggshell finish that fits the website palette.",
    source: "colorFabb rPLA Semi-Matte",
    url: "https://colorfabb.com/filaments/materials/pla-filaments/rpla-semi-matte",
    baseColor: "#eadfcf",
    tintColor: "#d9cbb8",
    lineColor: "#bca893",
    roughness: 0.9,
    metalness: 0.02,
    clearcoat: 0.03,
    reflectivity: 0.18,
    texture: "speckle"
  },
  {
    value: "rpetg_smoke",
    label: "rPETG Smoke",
    family: "Recycled PETG",
    finish: "Smoked translucent resin",
    summary: "Recycled PETG with a smoky, slightly translucent technical look.",
    source: "BigRep rPETG",
    url: "https://bigrep.com/filaments/rpetg/",
    baseColor: "#5f6267",
    tintColor: "#80858d",
    lineColor: "#2d3034",
    roughness: 0.28,
    metalness: 0.04,
    clearcoat: 0.2,
    reflectivity: 0.58,
    transmission: 0.12,
    opacity: 0.96,
    texture: "resin"
  },
  {
    value: "woodfill_pine",
    label: "woodFill Pine",
    family: "Wood Fiber PLA",
    finish: "Dry pine grain",
    summary: "PLA/PHA filled with recycled wood fibers for a natural pine-like surface.",
    source: "colorFabb woodFill",
    url: "https://colorfabb.com/woodfill",
    baseColor: "#c59b73",
    tintColor: "#a6744a",
    lineColor: "#805637",
    roughness: 0.88,
    metalness: 0.01,
    clearcoat: 0.04,
    reflectivity: 0.2,
    texture: "wood"
  },
  {
    value: "corkfill_umber",
    label: "corkFill Umber",
    family: "Cork Fiber PLA",
    finish: "Dark cork matte",
    summary: "Cork-filled PLA with a dry, porous, impact-soft visual texture.",
    source: "colorFabb corkFill",
    url: "https://colorfabb.com/corkfill",
    baseColor: "#6e4934",
    tintColor: "#8f6646",
    lineColor: "#442a1f",
    roughness: 0.94,
    metalness: 0.01,
    clearcoat: 0.02,
    reflectivity: 0.12,
    texture: "cork"
  },
  {
    value: "hemp_bio_sage",
    label: "Hemp Bio Sage",
    family: "Hemp Filled PLA",
    finish: "Fibrous sage-tan matte",
    summary: "Hemp-filled biocomposite with visible fibers and a muted organic tone.",
    source: "3D-Fuel Entwined Hemp",
    url: "https://www.3dfuel.com/products/entwined-hemp-filament-1-75mm",
    baseColor: "#a59d7f",
    tintColor: "#82765a",
    lineColor: "#5c523f",
    roughness: 0.92,
    metalness: 0.01,
    clearcoat: 0.03,
    reflectivity: 0.14,
    texture: "fiber"
  }
];

export const DEFAULT_PART_MATERIALS = {
  tabletop: "rpla_eggshell",
  legs: "rpetg_smoke"
};

export const CATALOG_TO_ECO_MATERIAL = {
  light_wood: "woodfill_pine",
  dark_walnut: "corkfill_umber",
  rough_stone: "allpha_bone",
  metal: "rpetg_smoke"
};

export function resolveEcoMaterialKey(key) {
  return CATALOG_TO_ECO_MATERIAL[key] || key;
}

export function getEcoMaterial(key) {
  const resolvedKey = resolveEcoMaterialKey(key);
  return ECO_MATERIALS.find((item) => item.value === resolvedKey) ?? ECO_MATERIALS[0];
}
