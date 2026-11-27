"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UtensilsCrossed, BookOpen, Dumbbell, ClipboardCheck, LayoutDashboard, Trophy, ShieldCheck, Lock, Star, ArrowRight, LogIn } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useGameStore, LEVEL_ORDER } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useHydrated } from "@/lib/useHydrated";
import { preTestDone, postTestDone } from "@/lib/records";

export default function MenuScreen() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { profile, progress, records } = useGameStore();
  const { configured, ready, user, isAdmin } = useAuth();

  // First visit: make the ID card before anything else.
  useEffect(() => {
    if (hydrated && ready && !profile.name) router.replace("/profile");
  }, [hydrated, ready, profile.name, router]);

  if (!hydrated || !ready) return <div className="min-h-screen bg-[#FFF8E7]" />;

  const stars = LEVEL_ORDER.reduce((sum, id) => sum + (progress[id]?.stars ?? 0), 0);
  const levelsDone = LEVEL_ORDER.filter((id) => (progress[id]?.stars ?? 0) > 0).length;
  const preDone = preTestDone(records);
  const postDone = postTestDone(records);
  const postOpen = levelsDone === LEVEL_ORDER.length;

  const items = [
    { href: "/learn", icon: BookOpen, title: "LESSONS", th: "บทเรียน: คำศัพท์และไวยากรณ์", note: "อ่านก่อนเล่นแต่ละร้าน", card: "bg-amber-600 shadow-[0_8px_0_#78350f] hover:shadow-[0_4px_0_#78350f]" },
    { href: "/practice", icon: Dumbbell, title: "PRACTICE", th: "ฝึกฝน: เกมคำศัพท์ การฟัง บทสนทนา", note: `ฝึกไปแล้ว ${records.practice.length} รอบ`, card: "bg-emerald-600 shadow-[0_8px_0_#065f46] hover:shadow-[0_4px_0_#065f46]" },
    { href: "/dashboard", icon: LayoutDashboard, title: "MY PROGRESS", th: "ความก้าวหน้าของฉัน", note: "คะแนน พัฒนาการ และกิจกรรมที่ทำแล้ว", card: "bg-violet-600 shadow-[0_8px_0_#4c1d95] hover:shadow-[0_4px_0_#4c1d95]" },
    { href: "/ranking", icon: Trophy, title: "RANKING", th: "อันดับคะแนน", note: user ? "เทียบกับเพื่อน ๆ" : "ต้องเข้าสู่ระบบ", card: "bg-amber-500 shadow-[0_8px_0_#92400e] hover:shadow-[0_4px_0_#92400e]" },
  ];

  return (
    <AppShell title="MAIN MENU" th={`สวัสดี เชฟ${profile.name ? ` ${profile.name}` : ""}! วันนี้จะฝึกอะไรดี`} back="/" backLabel="หน้าแรก">
      {configured && !user && (
        <Link href="/login" className="mb-5 flex items-center gap-3 bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 font-mitr text-orange-800 hover:bg-orange-100 transition-colors">
          <LogIn size={22} className="shrink-0" />
          <span className="flex-1">คุณกำลังเล่นแบบผู้เยี่ยมชม <b>เข้าสู่ระบบด้วย Google</b> เพื่อบันทึกคะแนนและขึ้นอันดับ</span>
          <ArrowRight size={20} />
        </Link>
      )}

      {/* Tests: the pre-test comes first, the post-test opens after all five restaurants */}
      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <TestCard
          href="/test/pre"
          title="PRE-TEST"
          th="แบบทดสอบก่อนเรียน"
          status={preDone ? "ทำแล้ว ดูผลได้" : "เริ่มที่นี่! ทำก่อนเล่นเกม (20 ข้อ)"}
          highlight={!preDone}
          done={preDone}
        />
        <TestCard
          href="/test/post"
          title="POST-TEST"
          th="แบบทดสอบหลังเรียน"
          status={postDone ? "ทำแล้ว ดูพัฒนาการได้" : postOpen ? "พร้อมแล้ว! วัดพัฒนาการของคุณ" : `ปลดล็อกเมื่อผ่านครบ ${LEVEL_ORDER.length} ร้าน (${levelsDone}/${LEVEL_ORDER.length})`}
          highlight={postOpen && !postDone}
          done={postDone}
          locked={!postOpen && !postDone}
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* PLAY: the hero tile, dressed as the restaurant's own signboard */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="sm:col-span-2 lg:col-span-1 lg:row-span-2">
          <Link
            href="/select"
            className="group relative flex h-full min-h-[260px] flex-col justify-end overflow-hidden rounded-[1.75rem] border-4 border-white shadow-[0_8px_0_#9a3412] transition-all hover:translate-y-1 hover:shadow-[0_4px_0_#9a3412]"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{ backgroundImage: "url('/assets/restaurant.webp')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
            <div className="relative z-10 flex flex-col gap-2 p-5 md:p-6">
              <div className="mb-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-white bg-orange-500 shadow-lg transition-transform group-hover:rotate-6">
                <UtensilsCrossed size={30} className="text-white" strokeWidth={2.4} />
              </div>
              <span className="font-luckiest-guy text-4xl tracking-wider text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.5)]">PLAY</span>
              <p className="font-mitr text-white/90">เล่นเกม: รับออเดอร์และทำอาหาร</p>
              <p className="mt-1 flex items-center gap-1 font-mitr text-xs text-amber-300">
                <Star size={12} className="fill-amber-300" />
                {stars}/{LEVEL_ORDER.length * 3} ดาว · ผ่าน {levelsDone}/{LEVEL_ORDER.length} ร้าน
              </p>
            </div>
          </Link>
        </motion.div>

        {items.map(({ href, icon: Icon, title, th, note, card }, i) => (
          <motion.div key={href} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 1) * 0.06 }}>
            <Link href={href} className={`group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border-4 border-white transition-all hover:translate-y-1 ${card}`}>
              <div className="relative flex items-center gap-4 p-5">
                <div className="absolute -right-4 -top-6 h-20 w-20 rounded-full bg-white/10" />
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-white/40 bg-white/20 backdrop-blur-sm transition-transform group-hover:rotate-6">
                  <Icon size={30} className="text-white drop-shadow-md" strokeWidth={2.4} />
                </div>
                <span className="font-luckiest-guy text-2xl tracking-wider text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.3)] md:text-3xl">{title}</span>
              </div>
              <div className="flex flex-1 flex-col justify-between gap-2 bg-white p-4">
                <p className="font-mitr text-stone-700">{th}</p>
                <p className="flex items-center gap-1 font-mitr text-xs text-stone-400">{note}</p>
              </div>
            </Link>
          </motion.div>
        ))}
        {isAdmin && (
          <Link href="/admin" className="flex items-center gap-4 bg-stone-800 hover:bg-stone-700 text-white rounded-[1.75rem] p-5 shadow-[0_8px_0_#44403c] transition-colors">
            <ShieldCheck size={36} className="shrink-0 text-amber-300" />
            <div>
              <p className="font-luckiest-guy text-2xl tracking-wider">TEACHER</p>
              <p className="font-mitr text-sm text-stone-300">ระบบหลังบ้าน: โจทย์ บทสนทนา และผลของนักเรียน</p>
            </div>
          </Link>
        )}
      </div>
    </AppShell>
  );
}

function TestCard({ href, title, th, status, highlight, done, locked }: { href: string; title: string; th: string; status: string; highlight?: boolean; done?: boolean; locked?: boolean }) {
  const body = (
    <div className={`h-full flex items-center gap-4 rounded-[1.5rem] p-4 border-4 transition-all ${
      locked ? "bg-stone-100 border-stone-200 text-stone-400" : highlight ? "bg-gradient-to-r from-rose-500 to-orange-500 border-white text-white shadow-[0_8px_0_#c2410c] hover:translate-y-1 hover:shadow-[0_4px_0_#c2410c]" : "bg-white border-white text-stone-700 shadow-[0_8px_0_#F3E3CF]"
    }`}>
      {locked ? <Lock size={32} className="shrink-0" /> : <ClipboardCheck size={32} className="shrink-0" />}
      <div className="min-w-0">
        <p className="font-luckiest-guy text-2xl tracking-wider leading-none">{title} {done && "✓"}</p>
        <p className={`font-mitr text-sm ${highlight ? "text-white/90" : ""}`}>{th}</p>
        <p className={`font-mitr text-xs mt-0.5 ${highlight ? "text-white/80" : "text-stone-400"}`}>{status}</p>
      </div>
      {highlight && <ArrowRight className="ml-auto shrink-0" />}
    </div>
  );
  return locked ? body : <Link href={href}>{body}</Link>;
}
