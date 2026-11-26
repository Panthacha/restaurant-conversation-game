"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useHydrated } from "@/lib/useHydrated";

// The frame around the menu pages: a back button, the page title (English + Thai) and who is playing.
export default function AppShell({
  title,
  th,
  back = "/menu",
  backLabel = "เมนูหลัก",
  wide = false,
  children,
}: {
  title: string;
  th?: string;
  back?: string;
  backLabel?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FFF8E7] relative overflow-x-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(#8B4513 2px, transparent 2px)", backgroundSize: "32px 32px" }} />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-orange-400/20 blur-[100px] rounded-full pointer-events-none" />

      <div className={`relative z-10 mx-auto px-4 md:px-8 py-5 md:py-8 ${wide ? "max-w-7xl" : "max-w-5xl"}`}>
        <header className="flex items-center justify-between gap-3 mb-6 md:mb-8">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <Link href={back} className="shrink-0 flex items-center gap-2 text-orange-700 bg-orange-100 hover:bg-orange-200 px-3 md:px-4 py-2 rounded-full text-sm font-bold transition-colors">
              <ArrowLeft size={18} strokeWidth={3} />
              <span className="hidden sm:inline font-mitr">{backLabel}</span>
            </Link>
            <div className="min-w-0">
              <h1 className="font-luckiest-guy text-3xl md:text-5xl text-[#FFB800] tracking-wider drop-shadow-[0_3px_0_#8B4513] leading-none truncate" style={{ WebkitTextStroke: "1.5px #5C2A0A" }}>
                {title}
              </h1>
              {th && <p className="font-mitr text-orange-800 text-sm md:text-lg mt-1 truncate">{th}</p>}
            </div>
          </div>
          <PlayerChip />
        </header>
        {children}
      </div>
    </div>
  );
}

export function PlayerChip() {
  const hydrated = useHydrated();
  const profile = useGameStore((s) => s.profile);
  const { user, configured } = useAuth();
  if (!hydrated) return null;
  const face = profile.avatar?.face?.startsWith("/") ? profile.avatar.face : "/assets/avatars/avatar1.webp";
  return (
    <Link href="/profile" className="shrink-0 flex items-center gap-2 md:gap-3 bg-white/80 hover:bg-white border-2 border-white rounded-2xl pl-1 pr-3 md:pr-4 py-1 shadow-[0_4px_0_#E7D7C3] transition-colors">
      <div className="relative w-10 h-10 bg-amber-400 rounded-xl overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={face} alt="" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] max-w-none" />
      </div>
      <div className="hidden sm:flex flex-col leading-tight">
        <span className="font-roasted text-lg text-orange-600 uppercase">{profile.name || "GUEST"}</span>
        <span className="font-mitr text-[11px] text-stone-400">{user ? profile.classroom || "นักเรียน" : configured ? "ยังไม่ได้เข้าสู่ระบบ" : "โหมดผู้เยี่ยมชม"}</span>
      </div>
    </Link>
  );
}

// A white card in the menu pages' style.
export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`bg-white rounded-[1.75rem] border-4 border-white shadow-[0_8px_0_#F3E3CF] p-5 md:p-6 ${className}`}>{children}</div>;
}

export function CefrBadge({ level, className = "" }: { level?: string | null; className?: string }) {
  if (!level) return <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 ${className}`}>TOPIC</span>;
  const tone = level.startsWith("A1") ? "bg-green-100 text-green-700" : level.startsWith("A2") ? "bg-lime-100 text-lime-700" : level.startsWith("B1") ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";
  return <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${tone} ${className}`}>{level}</span>;
}
