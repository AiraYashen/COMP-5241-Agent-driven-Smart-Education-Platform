export async function getConfiguredCurrentWeek(db: any): Promise<number> {
  const { data } = await db
    .from("academic_terms")
    .select("term_start_date")
    .eq("is_active", true)
    .order("term_start_date", { ascending: false })
    .limit(1);

  const startDateRaw = data?.[0]?.term_start_date as string | undefined;
  if (!startDateRaw) return 1;

  const start = new Date(`${startDateRaw}T00:00:00`);
  const now = new Date();
  if (Number.isNaN(start.getTime())) return 1;

  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}
