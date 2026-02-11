"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, ArrowLeft } from "lucide-react";

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

const findEmailSchema = z.object({
  daycareName: z.string().min(1, "어린이집명을 입력해주세요"),
  contactPhone: z.string().min(1, "담당자 연락처를 입력해주세요"),
});

type FindEmailFormValues = z.infer<typeof findEmailSchema>;

export function FindEmailForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [foundEmail, setFoundEmail] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const form = useForm<FindEmailFormValues>({
    resolver: zodResolver(findEmailSchema),
    defaultValues: {
      daycareName: "",
      contactPhone: "",
    },
  });

  async function onSubmit(values: FindEmailFormValues) {
    setIsLoading(true);
    setFoundEmail(null);
    setNotFound(false);

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("daycares")
        .select("email")
        .eq("name", values.daycareName)
        .eq("contact_phone", values.contactPhone.replace(/-/g, ""))
        .maybeSingle();

      if (error) {
        console.error("Error finding email:", error);
        setNotFound(true);
        return;
      }

      if (data?.email) {
        // 이메일 마스킹 처리
        const email = data.email;
        const [localPart, domain] = email.split("@");
        const maskedLocal =
          localPart.length <= 2
            ? localPart[0] + "*"
            : localPart.slice(0, 2) + "*".repeat(localPart.length - 2);
        setFoundEmail(`${maskedLocal}@${domain}`);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          로그인으로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-center">아이디(이메일) 찾기</h1>
        <p className="text-muted-foreground text-center mt-2">
          가입 시 등록한 어린이집명과 담당자 연락처를 입력해주세요
        </p>
      </div>

      {foundEmail ? (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              등록된 이메일(아이디)
            </p>
            <p className="text-xl font-bold text-gray-900">{foundEmail}</p>
          </div>
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/login">로그인하기</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/find-password">비밀번호 찾기</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="daycareName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>어린이집명</FormLabel>
                    <FormControl>
                      <Input placeholder="OO어린이집" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>담당자 연락처</FormLabel>
                    <FormControl>
                      <Input placeholder="010-1234-5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {notFound && (
                <p className="text-sm text-red-500 text-center">
                  일치하는 계정 정보를 찾을 수 없습니다.
                  <br />
                  입력한 정보를 다시 확인해주세요.
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                이메일 찾기
              </Button>
            </form>
          </Form>
        </>
      )}
    </div>
  );
}
