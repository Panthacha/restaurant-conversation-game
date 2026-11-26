import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase";

// Google sends the learner back here after they sign in. The one-time code is swapped for a
// session, which is stored in cookies the browser client then reads.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only paths on this site, so the link can't send someone elsewhere.
  const nextParam = searchParams.get("next") ?? "/profile";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/profile";

  if (code && isSupabaseConfigured) {
    const cookieStore = await cookies();
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=1`);
}
