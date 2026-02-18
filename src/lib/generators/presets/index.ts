import { MYPARCEL_PRESET } from "./myparcel";
import { DEVTOOLS_PRESET } from "./devtools";
import type { PresetId, PresetDefinition } from "@/types/company-profile";

export { MYPARCEL_PRESET } from "./myparcel";
export { DEVTOOLS_PRESET } from "./devtools";

export const PRESETS: Record<PresetId, PresetDefinition> = {
  myparcel: MYPARCEL_PRESET,
  devtools: DEVTOOLS_PRESET,
};

export function getPreset(id: PresetId): PresetDefinition | undefined {
  return PRESETS[id];
}

export function getAllPresets(): PresetDefinition[] {
  return Object.values(PRESETS);
}
