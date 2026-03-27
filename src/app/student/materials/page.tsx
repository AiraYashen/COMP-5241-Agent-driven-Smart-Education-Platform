"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

const TYPE_COLORS: Record<string, string> = {
  PDF: "#ef4444", PPT: "#f97316", PPTX: "#f97316",
  WORD: "#3b82f6", DOCX: "#3b82f6", VIDEO: "#a855f7",
  IMAGE: "#22c55e", OTHER: "#6b7280",
};
const typeOf = (t: string) => TYPE_COLORS[t.toUpperCase()] ?? "#6b7280";

export default function StudentMaterialsPage() {
  const t = useTranslations();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      // Get student's class id
      const { data: enrollment } = await supabase.from("enrollments").select("class_id").eq("student_id", userId).single();
      if (!enrollment?.class_id) { setLoading(false); return; }

      // Query materials directly by class_id (reliable, no teacher_classes dependency)
      const { data } = await supabase
        .from("materials")
        .select("id, title, type, file_url, file_size, created_at, users(name)")
        .eq("class_id", enrollment.class_id)
        .order("created_at", { ascending: false });

      setMaterials(data ?? []);
      setLoading(false);
    };
    load();
  }, [userId]);

  const trackView = async (materialId: string) => {
    await supabase.from("material_views").insert({
      student_id: userId,
      material_id: materialId,
      start_at: new Date().toISOString(),
    });
  };

  const types = ["ALL", ...Array.from(new Set(materials.map((m) => m.type)))];
  const filtered = filter === "ALL" ? materials : materials.filter((m) => m.type === filter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>{t("materialsEx.learningTitle")}</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{t("materialsEx.learningSubtitle")}</p>
      </div>

      {/* Filter tabs */}
      {types.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {types.map((tp) => (
            <button
              key={tp}
              onClick={() => setFilter(tp)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filter === tp ? "var(--accent)" : "var(--card)",
                color: filter === tp ? "#fff" : "var(--muted)",
                border: `1px solid ${filter === tp ? "var(--accent)" : "var(--card-border)"}`,
              }}
            >
              {tp === "ALL" ? t("materialsEx.all") : tp}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>{t("common.loading")}</p></Card>
      ) : filtered.length === 0 ? (
        <Card><p className="text-center py-8" style={{ color: "var(--muted)" }}>{t("materialsEx.noMaterials")}</p></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <Card key={m.id}>
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: typeOf(m.type) }}
                >
                  {m.type?.slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{m.title}</div>
  
                  <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                    {m.users?.name} · {new Date(m.created_at).toLocaleDateString("zh-CN")}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {m.file_url && (
                  <a
                    href={m.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackView(m.id)}
                    className="flex-1 text-center py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    查看
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
