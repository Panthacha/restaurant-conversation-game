"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ChefHat, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useGameStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";

// useSearchParams needs a Suspense boundary so the rest of the page can be prerendered.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}

function LoginScreen() {
  const router = useRouter();
  const failed = useSearchParams().get("error");
  const { configured, ready, user, profile, signInWithGoogle, signOut } = useAuth();
  const name = useGameStore((s) => s.profile.name);
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(failed ? "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง" : "");

  const google = async () => {
    setBusy(true);
    const message = await signInWithGoogle("/menu");
    if (message) {
      setError(message);
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative bg-stone-900 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/restaurant.webp" alt="" className="absolute inset-0 object-cover w-full h-full opacity-60 blur-md brightness-50" />

      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md bg-[#FDFCFB] rounded-[2rem] shadow-2xl p-8 text-center">
        <ChefHat size={56} className="mx-auto text-orange-500 mb-2" />
        <h1 className="font-luckiest-guy text-4xl text-[#FFB800] tracking-wider drop-shadow-[0_3px_0_#8B4513]" style={{ WebkitTextStroke: "1.5px #5C2A0A" }}>
          WELCOME, CHEF!
        </h1>
        <p className="font-mitr text-stone-500 mt-2 mb-6">เข้าสู่ระบบเพื่อบันทึกความก้าวหน้า ดูอันดับ และให้ครูติดตามผลการเรียน</p>

        {configured && ready && user ? (
          <div className="flex flex-col gap-3">
            <p className="font-mitr text-stone-700">
              เข้าสู่ระบบแล้วในชื่อ <b>{profile?.display_name || user.email}</b>
            </p>
            <button onClick={() => router.push(name ? "/menu" : "/profile")} className="bg-orange-500 hover:bg-orange-600 text-white font-mitr text-lg py-3 rounded-2xl shadow-[0_5px_0_#9a3412]">
              ไปที่เมนูหลัก
            </button>
            <button onClick={signOut} className="flex items-center justify-center gap-2 text-stone-500 hover:text-stone-700 font-mitr py-2">
              <LogOut size={18} /> ออกจากระบบ
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {configured ? (
              <button
                onClick={google}
                disabled={busy || !ready}
                className="flex items-center justify-center gap-3 bg-white hover:bg-stone-50 border-2 border-stone-200 text-stone-700 font-semibold text-lg py-3 rounded-2xl shadow-[0_4px_0_#e7e5e4] disabled:opacity-60"
              >
                <GoogleLogo /> {busy ? "กำลังไปที่ Google…" : "เข้าสู่ระบบด้วย Google"}
              </button>
            ) : (
              <p className="font-mitr text-sm text-amber-700 bg-amber-50 border-2 border-amber-200 rounded-2xl p-3">
                ระบบสมาชิกยังไม่ได้ตั้งค่า (ดู docs/SUPABASE_SETUP.md) ตอนนี้เล่นได้แบบผู้เยี่ยมชม
              </p>
            )}
            {error && <p className="font-mitr text-sm text-red-600">{error}</p>}
            <div className="flex items-center gap-3 text-stone-300 text-xs font-mitr my-1">
              <div className="flex-1 h-px bg-stone-200" /> หรือ <div className="flex-1 h-px bg-stone-200" />
            </div>
            <Link
              href={hydrated && name ? "/menu" : "/profile"}
              className="flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-600 font-mitr py-3 rounded-2xl"
            >
              <UserRound size={18} /> เล่นแบบผู้เยี่ยมชม
            </Link>
            <p className="font-mitr text-xs text-stone-400">ผู้เยี่ยมชม: ความก้าวหน้าเก็บไว้ในเครื่องนี้เท่านั้น ไม่ขึ้นอันดับ และไม่ถูกย้ายไปบัญชีภายหลัง</p>
          </div>
        )}
      </motion.div>
    </main>
  );
}

function GoogleLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
