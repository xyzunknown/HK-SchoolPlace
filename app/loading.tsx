import { SkeletonGrid } from "@/components/skeleton-card";

export default function Loading() {
  return (
    <main className="page-shell">
      <section className="hero animate-fade-in">
        <div className="skeleton skeleton-text" style={{ width: "100px", height: "14px" }} />
        <div className="skeleton skeleton-text" style={{ width: "200px", height: "32px", marginTop: 8 }} />
        <div className="skeleton skeleton-text" style={{ width: "300px", height: "16px", marginTop: 8 }} />
      </section>
      <SkeletonGrid count={6} />
    </main>
  );
}
