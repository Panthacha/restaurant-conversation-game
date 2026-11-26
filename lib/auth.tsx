"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { useGameStore } from "./store";
import { fetchRecords } from "./records";
import type { DbProfile } from "./types";

interface AuthState {
  configured: boolean; // Supabase is set up, so learners can sign in
  ready: boolean; // the stored session has been checked
  user: User | null;
  profile: DbProfile | null;
  isAdmin: boolean;
  signInWithGoogle: (next?: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  saveProfile: (fields: Partial<Pick<DbProfile, "display_name" | "avatar" | "classroom">>) => Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const loadedFor = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let alive = true;

    // Loads the account's profile and records, and makes them this device's progress.
    const load = async (next: User | null) => {
      const id = next?.id ?? null;
      if (loadedFor.current === id) return;
      loadedFor.current = id;
      const store = useGameStore.getState();
      if (!next) {
        // Signed out: anything left on the device belongs to guest play from now on.
        if (store.ownerId) {
          store.loadOwner(null, { attempts: [], practice: [], tests: [] });
          store.updateProfile({ name: "", classroom: "" });
        }
        if (alive) {
          setUser(null);
          setProfile(null);
          setReady(true);
        }
        return;
      }
      const [{ data }, records] = await Promise.all([
        sb.from("profiles").select("*").eq("id", next.id).maybeSingle<DbProfile>(),
        fetchRecords(next.id),
      ]);
      if (!alive) return;
      if (records) store.loadOwner(next.id, records);
      if (data) {
        store.updateProfile({
          name: data.display_name,
          classroom: data.classroom,
          ...(data.avatar ? { avatar: { ...store.profile.avatar, face: data.avatar } } : {}),
        });
      }
      setUser(next);
      setProfile(data ?? null);
      setReady(true);
    };

    sb.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    // Supabase calls made straight from this callback can deadlock, so they run just after it.
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => load(session?.user ?? null), 0);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthState = {
    configured: isSupabaseConfigured,
    ready,
    user,
    profile,
    isAdmin: profile?.role === "admin",
    async signInWithGoogle(next = "/profile") {
      const sb = getSupabase();
      if (!sb) return "ยังไม่ได้ตั้งค่า Supabase";
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      return error?.message ?? null;
    },
    async signOut() {
      await getSupabase()?.auth.signOut();
    },
    async saveProfile(fields) {
      const sb = getSupabase();
      if (!sb || !user) return null;
      const { data, error } = await sb.from("profiles").update(fields).eq("id", user.id).select().maybeSingle<DbProfile>();
      if (error) return error.message;
      if (data) setProfile(data);
      return null;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
