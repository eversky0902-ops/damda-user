"use client";

import { useState } from "react";
import { Download, FileCheck2, Info, Printer, RotateCcw, Sparkles } from "lucide-react";
import {
  buildFreeFormDocumentHtml,
  FREE_FORM_DEFINITION_BY_TYPE,
  getFreeFormExampleValues,
  getFreeFormInitialValues,
  type FreeFormField,
  type FreeFormType,
} from "@/lib/free-forms";
import { FreeFormPreview } from "./FreeFormPreview";

const inputClass = "mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-damda-yellow focus:ring-2 focus:ring-damda-yellow/20";

function EditorField({ field, value, onChange }: { field: FreeFormField; value: string; onChange: (value: string) => void }) {
  const common = { id: field.name, name: field.name, value, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(event.target.value), className: inputClass };
  return (
    <label htmlFor={field.name} className={`block text-sm font-semibold text-gray-700 ${field.fullWidth ? "sm:col-span-2" : ""}`}>
      {field.label}
      {field.kind === "textarea" ? (
        <textarea {...common} rows={3} placeholder={field.placeholder} className={`${inputClass} resize-y`} />
      ) : field.kind === "select" ? (
        <select {...common}>
          <option value="">선택하세요</option>
          {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input {...common} type={field.kind || "text"} min={field.kind === "number" ? 0 : undefined} step={field.kind === "number" ? 1 : undefined} placeholder={field.placeholder} inputMode={field.kind === "number" ? "numeric" : undefined} />
      )}
      {field.help && <span className="mt-1 block text-xs font-normal leading-5 text-gray-500">{field.help}</span>}
    </label>
  );
}

export function FreeFormEditor({ type }: { type: FreeFormType }) {
  const definition = FREE_FORM_DEFINITION_BY_TYPE[type];
  const [values, setValues] = useState(() => getFreeFormInitialValues(type));

  const updateValue = (name: string, value: string) => setValues((current) => ({ ...current, [name]: value }));

  const downloadWord = () => {
    const html = buildFreeFormDocumentHtml(type, values);
    const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${new Date().toISOString().slice(0, 10)}_${definition.downloadName}.doc`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const clearForm = () => {
    if (window.confirm("입력한 내용을 모두 비우고 빈 양식으로 바꿀까요?")) {
      setValues(getFreeFormInitialValues(type, true));
    }
  };

  return (
    <div className="document-page bg-slate-50" data-free-form-editor={type}>
      <div className="border-y border-teal-100 bg-teal-50 px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-7xl items-start gap-2 text-sm text-teal-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p><strong>로그인 없이 무료로 사용할 수 있습니다.</strong> 입력 내용은 서버에 저장되지 않습니다. Word·한글 호환 문서로 내려받거나 인쇄 창에서 PDF로 저장하세요.</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-6">
        <div className="space-y-5 print:hidden">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-damda-yellow-light p-2.5"><FileCheck2 className="h-5 w-5 text-damda-yellow-dark" /></span>
              <div><h2 className="text-xl font-black text-gray-950">{definition.title} 작성</h2><p className="mt-1 text-sm leading-6 text-gray-600">{definition.description}</p></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button type="button" onClick={() => setValues(getFreeFormExampleValues(type))} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-100"><Sparkles className="h-4 w-4" />예시 불러오기</button>
              <button type="button" onClick={clearForm} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"><RotateCcw className="h-4 w-4" />전체 비우기</button>
              <button type="button" onClick={downloadWord} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-damda-yellow px-3 py-2 text-sm font-bold text-gray-950 hover:bg-damda-yellow-dark"><Download className="h-4 w-4" />Word 다운로드</button>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-bold text-white hover:bg-gray-800"><Printer className="h-4 w-4" />인쇄·PDF</button>
            </div>
          </div>

          {definition.sections.map((section) => (
            <section key={section.title} className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-gray-950">{section.title}</h3>
              {section.description && <p className="mt-1 text-xs leading-5 text-gray-500">{section.description}</p>}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {section.fields.map((field) => <EditorField key={field.name} field={field} value={values[field.name] || ""} onChange={(value) => updateValue(field.name, value)} />)}
              </div>
            </section>
          ))}
        </div>

        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start print:static">
          <div className="mb-2 flex items-center justify-between print:hidden"><p className="text-sm font-bold text-gray-700">실시간 문서 미리보기</p><p className="text-xs text-gray-500">A4 기준</p></div>
          <FreeFormPreview definition={definition} values={values} />
        </div>
      </div>
    </div>
  );
}
