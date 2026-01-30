import { Suspense } from "react";
import { Metadata } from "next";
import {
  getLegalDocumentsByCategory,
  getLatestLegalDocument,
  getLegalDocumentById,
} from "@/services/contentService";
import { LegalDocumentViewer, type LegalDocument } from "@/components/legal/LegalDocumentViewer";

export const metadata: Metadata = {
  title: "이용약관 | 담다",
  description: "담다 서비스 이용약관을 확인하세요.",
};

interface PageProps {
  searchParams: Promise<{ version?: string }>;
}

async function TermsContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const documents = await getLegalDocumentsByCategory("terms");

  let currentDocument;
  if (params.version) {
    currentDocument = await getLegalDocumentById(params.version);
  } else {
    currentDocument = await getLatestLegalDocument("terms");
  }

  return (
    <LegalDocumentViewer
      category="terms"
      documents={documents}
      currentDocument={currentDocument}
    />
  );
}

export default async function TermsPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <TermsContent searchParams={props.searchParams} />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="px-4 py-6 border-b border-gray-200">
          <div className="h-7 bg-gray-200 rounded w-32 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-48 mt-2 animate-pulse" />
        </div>
        <div className="px-4 py-6 space-y-4">
          <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-4/6 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
