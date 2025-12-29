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

        // 프로필 조회
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", authUser.id)
          .single();

        if (profileData) {
          setProfile({
            id: profileData.id,
            userId: profileData.user_id,
            daycareId: profileData.daycare_id,
            role: profileData.role,
            isApproved: profileData.is_approved,
            createdAt: profileData.created_at,
            updatedAt: profileData.updated_at,
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
