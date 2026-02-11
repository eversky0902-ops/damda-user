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

const findPasswordSchema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
});

type FindPasswordFormValues = z.infer<typeof findPasswordSchema>;

export function FindPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const form = useForm<FindPasswordFormValues>({
    resolver: zodResolver(findPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: FindPasswordFormValues) {
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(
        values.email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        console.error("Error sending reset email:", error);
      }

      // 보안 상 이메일 존재 여부와 관계없이 발송 완료 메시지 표시
      setSentEmail(values.email);
      setEmailSent(true);
    } catch {
      // 보안 상 항상 성공으로 표시
      setSentEmail(values.email);
      setEmailSent(true);
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
        <h1 className="text-2xl font-bold text-center">비밀번호 찾기</h1>
        <p className="text-muted-foreground text-center mt-2">
          가입 시 사용한 이메일을 입력하시면
          <br />
          비밀번호 재설정 링크를 보내드립니다
        </p>
      </div>

      {emailSent ? (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 mb-2">
              이메일이 발송되었습니다
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-gray-900">{sentEmail}</span>
              으로
              <br />
              비밀번호 재설정 링크를 보냈습니다.
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              이메일이 보이지 않는다면 스팸함을 확인해주세요.
            </p>
          </div>
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/login">로그인으로 돌아가기</Link>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setEmailSent(false);
                form.reset();
              }}
            >
              다른 이메일로 시도
            </Button>
          </div>
        </div>
      ) : (
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              비밀번호 재설정 이메일 발송
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
