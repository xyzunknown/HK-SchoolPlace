import { AliasManager } from "@/components/admin/alias-manager";
import { EmptyState } from "@/components/empty-state";
import { ensureAdminPageAccess } from "@/lib/admin-page";
import { listAdminSchoolOptions, listAliases } from "@/lib/repositories/admin-repository";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAliasesPage({ searchParams }: Props) {
  await ensureAdminPageAccess();

  const params = await searchParams;
  const keyword = single(params.keyword) ?? null;
  const aliases = await listAliases({ keyword });
  const schoolOptions = await listAdminSchoolOptions();

  return (
    <main className="page-shell" style={{ paddingTop: "var(--sp-4)" }}>
      <section className="animate-fade-in">
        <p className="card-eyebrow" style={{ color: "var(--primary)" }}>後台 / Alias 管理</p>
        <h1 style={{ fontSize: "var(--font-title)" }}>Alias 管理</h1>
        <p className="text-muted">維護手動 alias，讓下次同步更容易自動匹配學校名稱。</p>
      </section>

      <section className="animate-slide-up" style={{ marginTop: "var(--sp-5)" }}>
        <form className="admin-toolbar" method="get">
          <input
            className="input"
            name="keyword"
            defaultValue={keyword ?? ""}
            placeholder="搜尋 alias 或學校名稱"
          />
          <button type="submit" className="btn-secondary">搜尋</button>
        </form>
      </section>

      <section className="animate-slide-up" style={{ marginTop: "var(--sp-5)" }}>
        <div className="chip-group">
          <span className="chip active">共 {aliases.length} 條 alias</span>
          {keyword ? <span className="chip">關鍵字：{keyword}</span> : null}
        </div>
      </section>

      <section className="animate-slide-up" style={{ animationDelay: "80ms", marginTop: "var(--sp-5)" }}>
        {schoolOptions.length === 0 ? (
          <EmptyState
            icon="🏫"
            title="目前沒有可綁定的學校"
            description="請先確認學校主資料已同步或匯入。"
          />
        ) : (
          <div style={{ display: "grid", gap: "var(--sp-5)" }}>
            {aliases.length === 0 ? (
              <EmptyState
                icon="🔍"
                title={keyword ? "找不到符合條件的 alias" : "暫時未有 alias"}
                description={keyword ? "你可以清除搜尋條件，或直接新增一條 alias。" : "可先在下方建立第一條 alias。"}
              />
            ) : null}
            <AliasManager aliases={aliases} schoolOptions={schoolOptions} />
          </div>
        )}
      </section>
    </main>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
