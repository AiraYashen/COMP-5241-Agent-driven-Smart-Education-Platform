import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import StudentShell from "./StudentShell";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || (role !== "STUDENT" && role !== "ADMIN")) redirect("/login");
  return <StudentShell session={session}>{children}</StudentShell>;
}
