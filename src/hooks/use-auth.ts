"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { ROUTES } from "@/constants";

export function useAuth() {
  const router = useRouter();
  const { user, profile, isLoading, setUser, setProfile, setIsLoading, reset } =
    useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.name || "",
          phone: authUser.user_metadata?.phone,
          createdAt: authUser.created_at,
        });

        // 어린이집 프로필 조회 (daycares 테이블의 id가 auth user id)
        const { data: daycareData } = await supabase
          .from("daycares")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (daycareData) {
          setProfile({
            id: daycareData.id,
            userId: daycareData.id,
            daycareId: daycareData.id,
            role: "daycare",
            isApproved: daycareData.status === "approved",
            createdAt: daycareData.created_at,
            updatedAt: daycareData.updated_at,
          });
        }
      }

      setIsLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        reset();
        router.push(ROUTES.LOGIN);
      } else if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || "",
          phone: session.user.user_metadata?.phone,
          createdAt: session.user.created_at,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, setUser, setProfile, setIsLoading, reset]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    isApproved: profile?.isApproved ?? false,
    signOut,
  };
}
