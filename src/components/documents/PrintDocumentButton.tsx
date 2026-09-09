"use client";

import { Printer } from "lucide-react";

export function PrintDocumentButton() {
  return <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 print:hidden"><Printer className="h-4 w-4" />인쇄·PDF 저장</button>;
}
