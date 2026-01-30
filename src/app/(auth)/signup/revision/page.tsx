"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Upload, X, FileText, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function SignupRevisionPage() {
  const router = useRouter();
  const [revisionReason, setRevisionReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchRevisionReason() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from("daycares")
            .select("revision_reason, status")
            .eq("id", user.id)
            .single();

          if (data?.revision_reason) {
            setRevisionReason(data.revision_reason);
          }

          // 보완필요 상태가 아니면 리다이렉트
          if (data?.status !== "revision_required") {
            router.replace("/");
          }
        } else {
          router.replace("/login");
        }
      } catch (error) {
        console.error("Failed to fetch revision reason:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRevisionReason();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // 파일 크기 제한 (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("파일 크기는 10MB 이하여야 합니다");
        return;
      }
      // 허용된 파일 형식
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error("JPG, PNG, GIF, PDF 파일만 업로드 가능합니다");
        return;
      }
      setFile(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("로그인이 필요합니다");
        router.push("/login");
        return;
      }

      let fileUrl = null;

      // 파일 업로드 (있는 경우)
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `revisions/${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("public")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          console.error("File upload error:", uploadError);
          toast.error("파일 업로드에 실패했습니다");
          return;
        }

        const { data: urlData } = supabase.storage
          .from("public")
          .getPublicUrl(fileName);

        fileUrl = urlData.publicUrl;
      }

      // 보완 제출 업데이트
      const { error: updateError } = await supabase
        .from("daycares")
        .update({
          status: "requested",
          revision_response: response || null,
          revision_file: fileUrl,
          revision_submitted_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Update error:", updateError);
        toast.error("제출에 실패했습니다");
        return;
      }

      toast.success("보완 자료가 제출되었습니다");
      router.push("/signup/complete");
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
      </div>

      <h1 className="mb-2 text-center text-2xl font-bold">보완이 필요합니다</h1>
      <p className="mb-8 text-center text-muted-foreground">
        가입 신청에 보완이 필요한 부분이 있습니다.
        <br />
        아래 내용을 확인 후 추가 자료를 제출해주세요.
      </p>

      {revisionReason && (
        <div className="mb-8 w-full rounded-lg border border-amber-200 bg-amber-50 p-6">
          <p className="mb-2 text-sm font-medium text-amber-700">보완 요청 사유</p>
          <p className="text-amber-600">{revisionReason}</p>
        </div>
      )}

      <div className="mb-8 w-full space-y-6">
        {/* 추가 설명 */}
        <div className="space-y-2">
          <Label htmlFor="response">
            추가 설명 <span className="font-normal text-muted-foreground">(선택)</span>
          </Label>
          <Textarea
            id="response"
            placeholder="보완 내용에 대한 설명을 입력해주세요"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={4}
          />
        </div>

        {/* 파일 업로드 */}
        <div className="space-y-2">
          <Label>
            첨부파일 <span className="font-normal text-muted-foreground">(선택)</span>
          </Label>
          <div className="flex flex-col gap-2">
            {file ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-6 transition-colors hover:border-primary/50 hover:bg-muted">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">파일을 선택하세요</p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, GIF, PDF (최대 10MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="mr-2 h-4 w-4" />
        )}
        보완 자료 제출
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        문의사항이 있으시면{" "}
        <a href="mailto:support@damda.com" className="text-primary hover:underline">
          support@damda.com
        </a>
        으로 연락해주세요.
      </p>

      <div className="mt-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
