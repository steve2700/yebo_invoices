import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { billingEnforced, hasAccess } from "@/lib/access";

// Pages anyone signed in can open without a paid plan, so they can set up, subscribe, and manage or cancel their plan.
const OPEN_WITHOUT_A_PLAN = ["/app/subscribe", "/app/settings", "/app/onboarding"];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isAppRoute = pathname === "/app" || pathname.startsWith("/app/");
  let res = NextResponse.next({ request: req });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Keep public routes available in preview until Supabase credentials are configured.
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isAppRoute) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return res;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && isAppRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // When billing is switched on, the app itself needs a paid-up plan. Clients can always view and pay documents (/d/...).
  if (user && isAppRoute && billingEnforced()) {
    const open = OPEN_WITHOUT_A_PLAN.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    if (!open) {
      const { data: sub } = await supabase.from("subscriptions").select("status,plan,current_period_end").maybeSingle();
      if (!hasAccess(sub)) {
        const url = new URL("/app/subscribe", req.url);
        if (sub) url.searchParams.set("reason", "expired");
        return NextResponse.redirect(url);
      }
    }
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|d/).*)"] };
