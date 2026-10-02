import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DEMO_COOKIE, DEMO_REPORT_ID } from "@/lib/dal";

// The portfolio link: no login, straight to the example report.
export async function GET() {
  (await cookies()).set(DEMO_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 14 });
  redirect(`/reports/${DEMO_REPORT_ID}`);
}
