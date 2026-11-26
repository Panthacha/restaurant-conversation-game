"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, LogOut } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useHydrated } from "@/lib/useHydrated";

const AVATARS = [
  "/assets/avatars/avatar1.webp",
  "/assets/avatars/avatar2.webp",
  "/assets/avatars/avatar3.webp"
];

export default function ProfileScreen() {
  // The card starts from what this browser saved, so it waits until that has been read.
  const hydrated = useHydrated();
  const { ready } = useAuth();
  if (!hydrated || !ready) return <div className="min-h-screen bg-stone-900" />;
  return <IdCard />;
}

function IdCard() {
  const router = useRouter();
  const { profile, updateProfile } = useGameStore();
  const { user, saveProfile, signOut } = useAuth();

  const [name, setName] = useState(profile.name || "");
  const [classroom, setClassroom] = useState(profile.classroom || "");
  const [avatarIndex, setAvatarIndex] = useState(() => {
    const idx = AVATARS.indexOf(profile.avatar.face);
    return idx !== -1 ? idx : 0;
  });
  const [error, setError] = useState("");
  const [isApproved, setIsApproved] = useState(false);
  const idNumber = user ? user.id.slice(0, 8).toUpperCase() : "GUEST";

  const handleAvatarClick = () => {
    if (isApproved) return;
    setAvatarIndex((prev) => (prev + 1) % AVATARS.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isApproved) return;

    if (!name.trim()) {
      setError("Name required!");
      return;
    }

    setError("");
    setIsApproved(true);
    const fields = { name: name.trim(), classroom: classroom.trim(), avatar: { ...profile.avatar, face: AVATARS[avatarIndex] } };
    updateProfile(fields);
    const saving = saveProfile({ display_name: fields.name, classroom: fields.classroom, avatar: fields.avatar.face });

    // Play stamp animation, wait, then navigate
    const [problem] = await Promise.all([saving, new Promise((r) => setTimeout(r, 1500))]);
    if (problem) {
      setError("บันทึกไม่สำเร็จ ลองอีกครั้ง");
      setIsApproved(false);
      return;
    }
    router.push("/menu");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative bg-stone-900 overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/restaurant.webp"
          alt="Background"
          className="object-cover w-full h-full opacity-60 blur-md brightness-50"
        />
        <div className="absolute inset-0 bg-stone-900/60 mix-blend-overlay" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 50, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: -1 }}
        transition={{ type: "spring", bounce: 0.4, duration: 1 }}
        className="relative z-10"
      >
        {/* Horizontal ID Card - Culinary Warm Theme */}
        <div className="w-full max-w-[540px] bg-[#FDFCFB] rounded-[24px] shadow-2xl relative pt-10 pb-8 px-6 sm:px-8 border border-stone-200"
             style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0,0,0,0.02)' }}>

          {/* Hole Punch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-3 bg-stone-900/80 rounded-full shadow-inner border border-stone-800" />

          {/* APPROVED STAMP OVERLAY */}
          <AnimatePresence>
            {isApproved && (
              <motion.div
                initial={{ scale: 5, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.9 }}
                transition={{
                  type: "spring",
                  damping: 15,
                  stiffness: 400,
                  duration: 0.2
                }}
                className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none mix-blend-multiply"
              >
                {/* Realistic Rubber Stamp Design */}
                <div className="relative border-[6px] border-green-700 text-green-700 font-roasted text-7xl py-2 px-6 transform -rotate-12 flex items-center justify-center
                                outline outline-[4px] outline-offset-4 outline-green-700 shadow-sm"
                     style={{
                       // Creating a fake distressed look using a CSS mask if supported, but simple opacity/blend works well too.
                       WebkitMaskImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
                       WebkitMaskComposite: 'destination-in',
                       maskComposite: 'intersect',
                       maskMode: 'alpha'
                     }}
                >
                  {/* A slightly offset duplicate text to simulate uneven ink */}
                  <span className="relative z-10 tracking-widest">APPROVED</span>
                  <span className="absolute inset-0 flex items-center justify-center tracking-widest blur-[1px] opacity-50 text-green-800">APPROVED</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="flex gap-5 sm:gap-8 h-full mt-4 relative z-10">

            {/* Left Side: Photo & Barcode */}
            <div className="w-28 sm:w-40 flex flex-col gap-6 shrink-0 mt-2">

              {/* Photo Box */}
              <div
                onClick={handleAvatarClick}
                className={`w-full h-36 sm:h-44 bg-amber-500 rounded-2xl flex items-end justify-center shadow-inner relative border-2 border-amber-600 ${isApproved ? 'opacity-80' : 'cursor-pointer group'}`}
              >
                {/* Image standing at the bottom, scaled up to massively pop out of the top */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={AVATARS[avatarIndex]}
                  alt="Chef Avatar"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[170%] max-w-none object-contain select-none drop-shadow-[0_12px_12px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-110 origin-bottom z-30"
                />
                {!isApproved && (
                  <div className="absolute inset-x-0 bottom-0 bg-black/40 py-2 text-center text-[10px] font-bold text-white uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm rounded-b-xl overflow-hidden">
                    Tap to change
                  </div>
                )}
              </div>

              {/* Fake Barcode */}
              <div className="text-center">
                <div className="text-[8px] font-bold tracking-widest text-stone-400 mb-1">KITCHEN CODE</div>
                <div className="flex gap-[2px] h-10 justify-center items-end opacity-70">
                  {[3,1,2,4,1,3,2,1,4,2,1,3,2].map((w, i) => (
                    <div key={i} className="bg-stone-300 rounded-sm" style={{ width: `${w * 2}px`, height: '100%' }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side: Details */}
            <div className={`flex-1 min-w-0 flex flex-col justify-between pt-2 ${isApproved ? 'opacity-80 pointer-events-none' : ''}`}>

              {/* Header */}
              <div className="text-left mb-2 border-b-2 border-amber-100 pb-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-stone-400 block mb-1">TEAM</span>
                <h2 className="text-5xl md:text-6xl font-roasted text-orange-600 leading-none drop-shadow-sm -rotate-2 origin-left inline-block">
                  CHEF!
                </h2>
              </div>

              {/* Details Area */}
              <div className="flex flex-col gap-5 mt-2">
                {/* Name Input */}
                <div className="relative">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-orange-700/70 mb-0.5">
                    NAME
                  </label>
                  <input
                    type="text"
                    value={name}
                    readOnly={isApproved}
                    onChange={(e) => {
                      setName(e.target.value.toUpperCase());
                      setError("");
                    }}
                    className={`w-full bg-transparent border-b-2 ${error ? 'border-red-500 text-red-600' : 'border-stone-300 text-stone-800'} focus:outline-none focus:border-orange-500 font-black text-2xl tracking-tight uppercase p-0 h-8 transition-colors`}
                    placeholder="YOUR NAME"
                    maxLength={15}
                  />
                  {error && <span className="absolute -bottom-4 left-0 text-[9px] text-red-500">{error}</span>}
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-orange-700/70 mb-0.5">
                      ROLE
                    </label>
                    <div className="font-bold text-sm text-stone-700 uppercase">CHEF</div>
                    <div className="h-[2px] w-full bg-stone-200 mt-0.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-orange-700/70 mb-0.5">
                      CLASS
                    </label>
                    <input
                      type="text"
                      value={classroom}
                      readOnly={isApproved}
                      onChange={(e) => setClassroom(e.target.value)}
                      placeholder="ม.4/1"
                      maxLength={20}
                      className="w-full bg-transparent border-b-2 border-stone-200 focus:outline-none focus:border-orange-500 font-bold text-sm text-stone-700 p-0 h-6"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-orange-700/70 mb-0.5">
                    ID NUMBER
                  </label>
                  <div className="font-bold text-sm text-orange-600 tracking-[0.2em]">{idNumber}</div>
                  <div className="h-[2px] w-full bg-stone-200 mt-0.5" />
                </div>
              </div>

              {/* Footer Text */}
              <div className="mt-6 text-[9px] font-bold text-stone-400 text-left uppercase tracking-widest pt-2">
                {user ? user.email : "This card is property of the Restaurant."}
              </div>

            </div>

            {/* Hidden Submit Button */}
            <button type="submit" id="submit-profile" className="hidden" />
          </form>
        </div>
      </motion.div>

      {/* External Action Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 z-10 flex flex-col items-center gap-3"
      >
        <label
          htmlFor="submit-profile"
          className={`group flex items-center justify-center gap-2 px-10 py-4 text-white rounded-full font-black text-xl tracking-widest uppercase transition-all ${
            isApproved
              ? 'bg-stone-500 cursor-not-allowed shadow-[0_4px_0_#57534e] translate-y-1'
              : 'bg-orange-600 cursor-pointer shadow-[0_8px_0_#9a3412] hover:translate-y-1 hover:shadow-[0_4px_0_#9a3412] active:translate-y-2 active:shadow-none'
          }`}
        >
          {isApproved ? 'PROCESSING...' : 'ENTER KITCHEN'}
          {!isApproved && <ChevronRight size={26} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />}
        </label>
        {user && (
          <button onClick={() => signOut().then(() => router.push("/login"))} className="flex items-center gap-2 text-stone-300 hover:text-white font-mitr text-sm">
            <LogOut size={16} /> ออกจากระบบ
          </button>
        )}
      </motion.div>
    </div>
  );
}
