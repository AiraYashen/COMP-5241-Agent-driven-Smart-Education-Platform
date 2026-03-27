import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { getTranslations, getMessages } from "next-intl/server";
import ScheduleBoard, { ScheduleBoardItem } from "@/components/ScheduleBoard";
import { getConfiguredCurrentWeek } from "@/lib/academicWeek";

export default async function StudentSchedulePage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const sb = createAdminClient();
  const t = await getTranslations();
  const messages = await getMessages();
  const weekDays = ((messages as any).schedule?.weekDays ?? ["周一","周二","周三","周四","周五"]) as string[];

  const { data: enrollment } = await sb.from("enrollments").select("class_id, classes(name)").eq("student_id", userId).single();
  const classId = enrollment?.class_id;
  const className = (enrollment?.classes as any)?.name ?? t("dashboard.noClass");

  const { data: schedules } = classId
    ? await sb.from("schedules").select("weekday, time_start, time_end, subject, room, users(name), week_type").eq("class_id", classId).order("time_start")
    : { data: [] };

  const items: ScheduleBoardItem[] = (schedules ?? []).map((s: any, idx: number) => ({
    id: `${s.weekday}-${s.time_start}-${s.subject}-${idx}`,
    weekday: s.weekday,
    time_start: s.time_start,
    time_end: s.time_end,
    subject: s.subject,
    room: s.room,
    teacherName: s.users?.name ?? null,
    week_type: s.week_type,
  }));
  const currentWeek = await getConfiguredCurrentWeek(sb);

  return (
    <ScheduleBoard
      title={t("scheduleEx.mySchedule")}
      subtitle={className}
      items={items}
      weekDays={weekDays.slice(0, 5)}
      emptyText={t("schedule.noClass")}
      currentWeek={currentWeek}
    />
  );
}
