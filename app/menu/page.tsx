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
    { href: "/select", icon: UtensilsCrossed, title: "PLAY", th: "เล่นเกม: รับออเดอร์และทำอาหาร", note: `${stars}/${LEVEL_ORDER.length * 3} ดาว · ผ่าน ${levelsDone}/${LEVEL_ORDER.length} ร้าน`, tone: "from-orange-400 to-amber-400", big: true },
    { href: "/learn", icon: BookOpen, title: "LESSONS", th: "บทเรียน: คำศัพท์และไวยากรณ์", note: "อ่านก่อนเล่นแต่ละร้าน", tone: "from-sky-400 to-cyan-400" },
    { href: "/practice", icon: Dumbbell, title: "PRACTICE", th: "ฝึกฝน: เกมคำศัพท์ การฟัง บทสนทนา", note: `ฝึกไปแล้ว ${records.practice.length} รอบ`, tone: "from-emerald-400 to-lime-400" },
    { href: "/dashboard", icon: LayoutDashboard, title: "MY PROGRESS", th: "ความก้าวหน้าของฉัน", note: "คะแนน พัฒนาการ และกิจกรรมที่ทำแล้ว", tone: "from-violet-400 to-fuchsia-400" },
    { href: "/ranking", icon: Trophy, title: "RANKING", th: "อันดับคะแนน", note: user ? "เทียบกับเพื่อน ๆ" : "ต้องเข้าสู่ระบบ", tone: "from-yellow-400 to-orange-400" },
  ];

  return (
    <AppShell title="MAIN MENU" th={`สวัสดี เชฟ${profile.name ? ` ${profile.name}` : ""}! วันนี้จะฝึกอะไรดี`} back="/" backLabel="หน้าแรก">
      {configured && !user && (
        <Link href="/login" className="mb-5 flex items-center gap-3 bg-white border-2 border-sky-200 rounded-2xl p-4 font-mitr text-sky-800 hover:bg-sky-50">
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
        {items.map(({ href, icon: Icon, title, th, note, tone, big }, i) => (
          <motion.div key={href} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className={big ? "sm:col-span-2 lg:col-span-1 lg:row-span-2" : ""}>
            <Link href={href} className="group h-full flex flex-col bg-white rounded-[1.75rem] border-4 border-white shadow-[0_8px_0_#F3E3CF] hover:shadow-[0_4px_0_#F3E3CF] hover:translate-y-1 transition-all overflow-hidden">
              <div className={`bg-gradient-to-br ${tone} p-5 flex items-center gap-4 ${big ? "lg:flex-1 lg:flex-col lg:justify-center lg:py-10" : ""}`}>
                <Icon size={big ? 56 : 36} className="text-white drop-shadow-md shrink-0" strokeWidth={2.4} />
                <span className="font-luckiest-guy text-2xl md:text-3xl text-white tracking-wider drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">{title}</span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between gap-2">
                <p className="font-mitr text-stone-700">{th}</p>
                <p className="font-mitr text-xs text-stone-400 flex items-center gap-1">
                  {href === "/select" && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                  {note}
                </p>
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
