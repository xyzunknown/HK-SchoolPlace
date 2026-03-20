import { Stage } from "@/lib/types";

export function parseStage(value: string | null): Stage | null {
  if (value === "kg" || value === "primary" || value === "secondary") {
    return value;
  }

  return null;
}

export function parseBoolean(value: string | null): boolean | undefined {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

export function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}
