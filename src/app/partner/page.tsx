"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, Building2, Phone, MapPin, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { DaumPostcodeEmbed, type Address } from "react-daum-postcode";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

const partnerSchema = z.object({
  name: z.string().min(2, "업체명을 입력해주세요"),
  businessNumber: z.string().min(10, "사업자등록번호를 입력해주세요"),
  representative: z.string().min(2, "대표자명을 입력해주세요"),
  contactName: z.string().min(2, "담당자명을 입력해주세요"),
  contactPhone: z
    .string()
    .regex(/^[0-9-]+$/, "올바른 전화번호를 입력해주세요")
    .min(10, "올바른 전화번호를 입력해주세요"),
  email: z.string().email("올바른 이메일을 입력해주세요"),
  zipcode: z.string().optional(),
  address: z.string().optional(),
  addressDetail: z.string().optional(),
  programTypes: z.string().min(2, "제공하시는 프로그램 유형을 입력해주세요"),
  description: z.string().min(10, "업체 소개를 10자 이상 입력해주세요"),
});

type PartnerFormValues = z.infer<typeof partnerSchema>;

export default function PartnerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: "",
      businessNumber: "",
      representative: "",
      contactName: "",
      contactPhone: "",
      email: "",
      zipcode: "",
      address: "",
      addressDetail: "",
      programTypes: "",
      description: "",
    },
  });

  const handlePostcodeComplete = (data: Address) => {
    form.setValue("zipcode", data.zonecode);
    form.setValue("address", data.roadAddress || data.jibunAddress);
    setIsPostcodeOpen(false);
  };

  async function onSubmit(values: PartnerFormValues) {
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.from("partner_inquiries").insert({
        name: values.name,
        business_number: values.businessNumber,
        representative: values.representative,
        contact_name: values.contactName,
        contact_phone: values.contactPhone,
        email: values.email,
        zipcode: values.zipcode || null,
        address: values.address || null,
        address_detail: values.addressDetail || null,
        program_types: values.programTypes,
        description: values.description,
        status: "pending",
      });

      if (error) {
        console.error("Partner inquiry error:", error);
        toast.error("문의 등록에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      setIsSubmitted(true);
      toast.success("입점 문의가 등록되었습니다.");
    } catch {
      toast.error("오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b bg-white">
          <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
            <Link href="/">
              <Image src="/logo.svg" alt="담다" width={80} height={32} className="h-8 w-auto" />
            </Link>
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mb-2 text-2xl font-bold">문의가 접수되었습니다</h1>
            <p className="mb-8 text-muted-foreground">
              담당자가 검토 후 빠른 시일 내에 연락드리겠습니다.
            </p>
            <Button asChild>
              <Link href="/">홈으로 돌아가기</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
          <Link href="/">
            <Image src="/logo.svg" alt="담다" width={80} height={32} className="h-8 w-auto" />
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-2xl px-4">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            홈으로
          </Link>

          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold">입점 문의</h1>
            <p className="text-muted-foreground">
              담다에 체험 프로그램을 등록하고 싶으신 업체는 아래 양식을 작성해주세요.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* 업체 정보 */}
                <div>
                  <h2 className="mb-4 flex items-center gap-2 font-semibold">
                    <Building2 className="h-5 w-5 text-primary" />
                    업체 정보
                  </h2>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>업체명 *</FormLabel>
                          <FormControl>
                            <Input placeholder="(주)OO체험학습" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="businessNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>사업자등록번호 *</FormLabel>
                            <FormControl>
                              <Input placeholder="000-00-00000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="representative"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>대표자명 *</FormLabel>
                            <FormControl>
                              <Input placeholder="홍길동" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="programTypes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>프로그램 유형 *</FormLabel>
                          <FormControl>
                            <Input placeholder="예: 자연체험, 문화체험, 직업체험 등" {...field} />
                          </FormControl>
                          <FormDescription>
                            제공하시는 프로그램의 유형을 입력해주세요
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 담당자 정보 */}
                <div className="border-t pt-6">
                  <h2 className="mb-4 flex items-center gap-2 font-semibold">
                    <Phone className="h-5 w-5 text-primary" />
                    담당자 정보
                  </h2>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>담당자명 *</FormLabel>
                          <FormControl>
                            <Input placeholder="홍길동" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>연락처 *</FormLabel>
                            <FormControl>
                              <Input placeholder="010-1234-5678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>이메일 *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* 주소 정보 */}
                <div className="border-t pt-6">
                  <h2 className="mb-4 flex items-center gap-2 font-semibold">
                    <MapPin className="h-5 w-5 text-primary" />
                    주소 정보 (선택)
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-end gap-2">
                      <FormField
                        control={form.control}
                        name="zipcode"
                        render={({ field }) => (
                          <FormItem className="flex-shrink-0">
                            <FormLabel>우편번호</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="우편번호"
                                className="w-28"
                                readOnly
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsPostcodeOpen(true)}
                      >
                        <Search className="mr-2 h-4 w-4" />
                        주소검색
                      </Button>
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>주소</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="주소검색을 통해 입력해주세요"
                              readOnly
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="addressDetail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>상세주소</FormLabel>
                          <FormControl>
                            <Input placeholder="상세주소를 입력해주세요" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 업체 소개 */}
                <div className="border-t pt-6">
                  <h2 className="mb-4 flex items-center gap-2 font-semibold">
                    <FileText className="h-5 w-5 text-primary" />
                    업체 소개
                  </h2>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>업체 및 프로그램 소개 *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="업체 소개와 제공하시는 프로그램에 대해 간략히 설명해주세요."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  입점 문의하기
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} 담다. All rights reserved.</p>
      </footer>

      {/* 주소검색 모달 */}
      <Dialog open={isPostcodeOpen} onOpenChange={setIsPostcodeOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>주소검색</DialogTitle>
          </DialogHeader>
          <DaumPostcodeEmbed
            onComplete={handlePostcodeComplete}
            style={{ height: 450 }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
