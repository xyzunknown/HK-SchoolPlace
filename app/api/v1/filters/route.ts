import { jsonOk } from "@/lib/http";
import { getFilters } from "@/lib/schools";
import { parseStage } from "@/lib/query";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stage = parseStage(searchParams.get("stage"));

  return jsonOk(getFilters(stage ?? undefined));
}
