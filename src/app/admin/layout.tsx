import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminShell from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/login");
  }
  return <AdminShell session={session}>{children}</AdminShell>;
}
