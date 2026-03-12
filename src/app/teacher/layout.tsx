import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TeacherShell from "./TeacherShell";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || (role !== "TEACHER" && role !== "ADMIN")) redirect("/login");
  return <TeacherShell session={session}>{children}</TeacherShell>;
}
