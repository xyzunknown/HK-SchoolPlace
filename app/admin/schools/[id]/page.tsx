import { notFound } from "next/navigation";

import { SchoolEditor } from "@/components/admin/school-editor";
import { ensureAdminPageAccess } from "@/lib/admin-page";
import { getAdminSchoolById } from "@/lib/repositories/admin-repository";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminSchoolDetailPage({ params }: Props) {
  await ensureAdminPageAccess();

  const { id } = await params;
  const school = await getAdminSchoolById(id);

  if (!school) {
    notFound();
  }

  return (
    <main className="page-shell" style={{ paddingTop: "var(--sp-4)" }}>
      <section className="animate-fade-in">
        <p className="card-eyebrow" style={{ color: "var(--primary)" }}>後台 / 學校管理</p>
        <h1 style={{ fontSize: "var(--font-title)" }}>{school.nameZh}</h1>
        <p className="text-muted">編輯學校主資料、展示狀態與對前台可見的核心資訊。</p>
      </section>

      <section className="animate-slide-up" style={{ marginTop: "var(--sp-5)" }}>
        <SchoolEditor school={school} />
      </section>
    </main>
  );
}
