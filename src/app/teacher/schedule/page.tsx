import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { getTranslations, getMessages } from "next-intl/server";
import ScheduleBoard, { ScheduleBoardItem } from "@/components/ScheduleBoard";
import { getConfiguredCurrentWeek } from "@/lib/academicWeek";

export default async function TeacherSchedulePage() {
  const session = await auth();
  const teacherId = (session?.user as any)?.id;
  const db = createAdminClient();
  const t = await getTranslations();
  const messages = await getMessages();
  const weekDays = ((messages as any).schedule?.weekDays ?? ["周一","周二","周三","周四","周五"]) as string[];

  const { data: schedules } = await db
    .from("schedules")
    .select("*, classes(name)")
    .eq("teacher_id", teacherId)
    .order("weekday")
    .order("time_start");

  const items: ScheduleBoardItem[] = (schedules ?? []).map((s: any) => ({
    id: s.id,
    weekday: s.weekday,
    time_start: s.time_start,
    time_end: s.time_end,
    subject: s.subject,
    room: s.room,
    className: s.classes?.name ?? null,
    week_type: s.week_type,
  }));
  const currentWeek = await getConfiguredCurrentWeek(db);

  return (
    <ScheduleBoard
      title={t("scheduleEx.mySchedule")}
      subtitle={t("scheduleEx.termSchedule")}
      items={items}
      weekDays={weekDays.slice(0, 5)}
      emptyText={t("schedule.noClass")}
      currentWeek={currentWeek}
    />
  );
}
