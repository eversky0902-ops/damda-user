"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 로그인된 상태면 홈으로 리다이렉트
        router.push("/home");
        router.refresh();
      } else {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        if (error.code === "invalid_credentials" ||
            error.message?.includes("Invalid login credentials")) {
          toast.error("이메일 또는 비밀번호가 올바르지 않습니다");
        } else if (error.code === "email_not_confirmed") {
          toast.error("이메일 인증이 완료되지 않았습니다");
        } else {
          toast.error(error.message || "로그인에 실패했습니다");
        }
        return;
      }

      // 승인 상태 확인
      if (authData.user) {
        const { data: daycare } = await supabase
          .from("daycares")
          .select("status")
          .eq("id", authData.user.id)
          .single();

        if (!daycare) {
          toast.error("어린이집 정보를 찾을 수 없습니다");
          return;
        }

        // 상태에 따른 리다이렉트
        switch (daycare.status) {
          case "approved":
            toast.success("로그인되었습니다");
            router.push("/home");
            router.refresh();
            return;
          case "rejected":
            router.push("/signup/rejected");
            router.refresh();
            return;
          case "revision_required":
            router.push("/signup/revision");
            router.refresh();
            return;
          default:
            // pending, requested 상태
            router.push("/signup/complete");
            router.refresh();
            return;
        }
      }

      toast.success("로그인되었습니다");
      router.push("/home");
      router.refresh();
    } catch {
      toast.error("오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  }

  // 로그인 상태 확인 중에는 로딩 표시
  if (isChecking) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold">로그인</h1>
        <p className="text-muted-foreground">
          어린이집 계정으로 로그인하세요
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이메일</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            로그인
          </Button>
        </form>
      </Form>

      <div className="mt-4 flex items-center justify-center gap-3 text-sm">
        <a href="/find-email" className="text-muted-foreground hover:text-primary hover:underline">
          아이디(이메일) 찾기
        </a>
        <span className="text-muted-foreground">|</span>
        <a href="/find-password" className="text-muted-foreground hover:text-primary hover:underline">
          비밀번호 찾기
        </a>
      </div>

      <div className="mt-4 text-center text-sm">
        <span className="text-muted-foreground">계정이 없으신가요? </span>
        <Link href="/signup" className="font-medium text-primary hover:underline">
          회원가입
        </Link>
      </div>
    </div>
  );
}
