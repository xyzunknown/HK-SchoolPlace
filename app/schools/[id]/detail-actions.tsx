"use client";

import { FavoriteButton } from "@/components/favorite-button";
import { CompareButton } from "@/components/compare-button";

type Props = {
  schoolId: string;
  initialFavorited: boolean;
  initialInComparison: boolean;
};

export function SchoolDetailActions({
  schoolId,
  initialFavorited,
  initialInComparison
}: Props) {
  return (
    <div className="card-actions" style={{ marginTop: "var(--sp-5)", borderTop: "none", paddingTop: 0 }}>
      <FavoriteButton schoolId={schoolId} initialFavorited={initialFavorited} />
      <CompareButton schoolId={schoolId} initialInComparison={initialInComparison} />
    </div>
  );
}
