"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Users, Trophy, ListChecks, MessagesSquare, RefreshCw, ShieldAlert } from "lucide-react";
import AppShell, { Card } from "@/components/AppShell";
import Leaderboard from "@/components/Leaderboard";
import { useAuth } from "@/lib/auth";
import { fetchClassData, type ClassData } from "@/lib/admin";
import Overview from "./Overview";
import Students from "./Students";
import QuestionsAdmin from "./Questions";
import ConversationsAdmin from "./Conversations";

const TABS = [
  { id: "overview", th: "ภาพรวม", icon: LayoutDashboard },
  { id: "students", th: "นักเรียน", icon: Users },
  { id: "ranking", th: "อันดับ", icon: Trophy },
  { id: "questions", th: "จัดการโจทย์", icon: ListChecks },
  { id: "conversations", th: "จัดการบทสนทนา", icon: MessagesSquare },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function AdminScreen() {
  const { configured, ready, user, isAdmin, profile } = useAuth();

  if (!ready) return <AppShell title="TEACHER" th="ระบบหลังบ้าน"><div /></AppShell>;
  if (!configured || !user || !isAdmin) {
    return (
      <AppShell title="TEACHER" th="ระบบหลังบ้านสำหรับครู">
        <Card className="text-center py-10 max-w-xl mx-auto">
          <ShieldAlert size={48} className="mx-auto text-amber-500 mb-3" />
          <p className="font-mitr text-lg text-stone-700 mb-2">หน้านี้สำหรับครูและผู้ดูแลเท่านั้น</p>
          <p className="font-mitr text-sm text-stone-500">
            {!configured
              ? "ยังไม่ได้ตั้งค่า Supabase (ดู docs/SUPABASE_SETUP.md)"
              : !user
                ? "เข้าสู่ระบบด้วยบัญชี Google ของครูก่อน"
                : `บัญชี ${profile?.email ?? user.email} ยังไม่มีสิทธิ์ผู้ดูแล ให้ผู้ดูแลคนอื่นเพิ่มสิทธิ์ให้ หรือตั้งค่าตามขั้นตอนใน docs/SUPABASE_SETUP.md`}
          </p>
          {configured && !user && <Link href="/login" className="inline-block mt-5 font-mitr bg-orange-500 text-white px-6 py-3 rounded-2xl">เข้าสู่ระบบ</Link>}
        </Card>
      </AppShell>
    );
  }
  return <AdminPanel />;
}

function AdminPanel() {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<ClassData | null>(null);
  const [error, setError] = useState("");
  const [classroom, setClassroom] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await fetchClassData();
    setData(data);
    setError(error ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClassData().then(({ data, error }) => {
      setData(data);
      setError(error ?? "");
      setLoading(false);
    });
  }, []);

  const refresh = () => {
    setLoading(true);
    void load();
  };

  const classrooms = [...new Set((data?.profiles ?? []).map((p) => p.classroom).filter(Boolean))].sort();
  const people = (data?.profiles ?? []).filter((p) => !classroom || p.classroom === classroom);
  const students = people.filter((p) => p.role === "student");

  return (
    <AppShell title="TEACHER" th="ระบบหลังบ้าน: ติดตามผลการเรียน จัดการโจทย์และบทสนทนา" wide>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {TABS.map(({ id, th, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 font-mitr text-sm px-4 py-2 rounded-2xl border-2 ${tab === id ? "bg-stone-800 border-stone-800 text-white" : "bg-white border-white text-stone-600 hover:border-stone-200"}`}>
            <Icon size={16} /> {th}
          </button>
        ))}
        {(tab === "overview" || tab === "students" || tab === "ranking") && (
          <div className="flex items-center gap-2 ml-auto">
            <select value={classroom} onChange={(e) => setClassroom(e.target.value)} className="font-mitr text-sm rounded-xl border-2 border-stone-200 px-3 py-2 bg-white">
              <option value="">ทุกห้อง</option>
              {classrooms.map((c) => <option key={c} value={c}>ห้อง {c}</option>)}
            </select>
            <button onClick={refresh} title="โหลดข้อมูลใหม่" className="p-2.5 rounded-xl bg-white border-2 border-stone-200 text-stone-500 hover:text-orange-600">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        )}
      </div>

      {error && <Card className="mb-4"><p className="font-mitr text-red-600">โหลดข้อมูลไม่สำเร็จ: {error}</p></Card>}

      {tab === "overview" && data && <Overview data={data} students={students} />}
      {tab === "students" && data && <Students data={data} people={people} onChanged={refresh} />}
      {tab === "ranking" && (
        <Card>
          <Leaderboard classroom={classroom || undefined} />
        </Card>
      )}
      {tab === "questions" && <QuestionsAdmin />}
      {tab === "conversations" && <ConversationsAdmin />}
    </AppShell>
  );
}
