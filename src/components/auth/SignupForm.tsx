"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Upload, X, FileText, Plus } from "lucide-react";
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
  FormDescription,
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";

interface FileItem {
  file: File;
  id: string;
}

const signupSchema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
  passwordConfirm: z.string(),
  name: z.string().min(2, "어린이집명을 입력해주세요"),
  contactName: z.string().min(2, "담당자명을 입력해주세요"),
  contactPhone: z
    .string()
    .regex(/^[0-9-]+$/, "올바른 전화번호를 입력해주세요")
    .min(10, "올바른 전화번호를 입력해주세요"),
  licenseNumber: z.string().min(1, "인가번호를 입력해주세요"),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["passwordConfirm"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [licenseFiles, setLicenseFiles] = useState<FileItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: FileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // 파일 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: 파일 크기는 10MB 이하여야 합니다`);
        continue;
      }
      // 허용된 파일 형식
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: JPG, PNG, GIF, PDF 파일만 업로드 가능합니다`);
        continue;
      }
      // 최대 5개 제한
      if (licenseFiles.length + newFiles.length >= 5) {
        toast.error("최대 5개까지 업로드 가능합니다");
        break;
      }

      newFiles.push({
        file,
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      });
    }

    if (newFiles.length > 0) {
      setLicenseFiles(prev => [...prev, ...newFiles]);
    }

    // 입력 초기화 (같은 파일 다시 선택 가능하게)
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (id: string) => {
    setLicenseFiles(prev => prev.filter(f => f.id !== id));
  };

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      passwordConfirm: "",
      name: "",
      contactName: "",
      contactPhone: "",
      licenseNumber: "",
    },
  });

  async function onSubmit(values: SignupFormValues) {
    setIsLoading(true);

    try {
      const supabase = createClient();

      // 0. 기존 세션 로그아웃 (다른 계정 로그인 상태에서 가입 시도하는 경우 대비)
      await supabase.auth.signOut();

      // 1. Supabase Auth 회원가입
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name,
          },
        },
      });

      if (authError) {
        if (authError.message?.includes("over_email_send_rate_limit") ||
            authError.code === "over_email_send_rate_limit") {
          toast.error("잠시 후 다시 시도해주세요 (25초 후 가능)");
        } else if (authError.message?.includes("already registered") ||
                   authError.message?.includes("already been registered")) {
          toast.error("이미 가입된 이메일입니다");
        } else {
          toast.error(authError.message || "회원가입에 실패했습니다");
        }
        return;
      }

      if (!authData.user) {
        toast.error("회원가입에 실패했습니다");
        return;
      }

      // 이미 가입된 이메일인 경우 identities가 비어있음
      if (!authData.user.identities || authData.user.identities.length === 0) {
        toast.error("이미 가입된 이메일입니다");
        return;
      }

      // 2. daycares 테이블에 어린이집 정보 저장 (파일 업로드 전에 먼저 생성)
      const { error: daycareError } = await supabase.from("daycares").insert({
        id: authData.user.id,
        email: values.email,
        name: values.name,
        contact_name: values.contactName,
        contact_phone: values.contactPhone,
        license_number: values.licenseNumber,
        license_file: "", // 레거시 필드 - 빈 값으로 유지
        address: "",
        status: "pending",
      });

      if (daycareError) {
        console.error("Daycare insert error:", daycareError);
        if (daycareError.code === "23505" ||
            daycareError.message?.includes("duplicate") ||
            daycareError.message?.includes("unique")) {
          toast.error("이미 가입된 이메일입니다");
        } else {
          toast.error("어린이집 정보 저장에 실패했습니다");
        }
        return;
      }

      // 3. 인가증 파일 업로드 (있는 경우) - daycare_documents 테이블에 저장
      if (licenseFiles.length > 0) {
        for (let i = 0; i < licenseFiles.length; i++) {
          const fileItem = licenseFiles[i];
          const file = fileItem.file;
          const fileExt = file.name.split(".").pop();
          const timestamp = Date.now();
          const random = Math.random().toString(36).substring(7);
          const fileName = `daycare-documents/${authData.user.id}/license_${timestamp}_${random}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("public")
            .upload(fileName, file, {
              cacheControl: "3600",
              upsert: true,
            });

          if (uploadError) {
            console.error("License file upload error:", uploadError);
            // 파일 업로드 실패해도 회원가입은 진행 (나중에 추가 가능)
            continue;
          }

          const { data: urlData } = supabase.storage
            .from("public")
            .getPublicUrl(fileName);

          // daycare_documents 테이블에 저장
          await supabase.from("daycare_documents").insert({
            daycare_id: authData.user.id,
            document_type: "license",
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_size: file.size,
            mime_type: file.type,
            sort_order: i,
          });
        }
      }

      toast.success("회원가입이 완료되었습니다.");
      router.push("/signup/complete");
    } catch {
      toast.error("오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold">회원가입</h1>
        <p className="text-muted-foreground">
          어린이집 정보를 입력하고 가입하세요
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
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormDescription>6자 이상 입력해주세요</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="passwordConfirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호 확인</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="border-t pt-4">
            <h3 className="mb-4 font-medium">어린이집 정보</h3>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
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
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>인가번호</FormLabel>
                    <FormControl>
                      <Input placeholder="어린이집 인가번호" {...field} />
                    </FormControl>
                    <FormDescription>
                      아이사랑보육포털에서 확인 가능합니다
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 인가증 파일 업로드 (다중) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  인가증 첨부 <span className="text-muted-foreground font-normal">(선택, 최대 5개)</span>
                </label>
                <div className="flex flex-col gap-2">
                  {/* 업로드된 파일 목록 */}
                  {licenseFiles.map((fileItem) => (
                    <div
                      key={fileItem.id}
                      className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3"
                    >
                      <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(fileItem.id)}
                        className="h-8 w-8 p-0 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {/* 파일 추가 버튼 (5개 미만일 때만 표시) */}
                  {licenseFiles.length < 5 && (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-6 transition-colors hover:border-primary/50 hover:bg-muted">
                      {licenseFiles.length === 0 ? (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-sm font-medium">파일을 선택하세요</p>
                            <p className="text-xs text-muted-foreground">
                              JPG, PNG, GIF, PDF (각 최대 10MB)
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Plus className="h-6 w-6 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            파일 추가 ({licenseFiles.length}/5)
                          </p>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.gif,.pdf"
                        onChange={handleFileChange}
                        multiple
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  어린이집 인가증 사본을 첨부하시면 승인이 빨라집니다
                </p>
              </div>

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>담당자명</FormLabel>
                    <FormControl>
                      <Input placeholder="홍길동" {...field} />
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
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            회원가입
          </Button>
        </form>
      </Form>

      <div className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
        <Link href="/login" className="font-medium text-primary hover:underline">
          로그인
        </Link>
      </div>
    </div>
  );
}
