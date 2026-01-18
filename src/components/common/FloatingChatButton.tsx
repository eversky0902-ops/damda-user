"use client";

export function FloatingChatButton() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button className="w-14 h-14 bg-damda-yellow rounded-full flex items-center justify-center shadow-lg hover:bg-damda-yellow-dark transition-colors">
        <span className="text-2xl">💬</span>
      </button>
      <span className="absolute -top-1 -right-1 bg-damda-teal text-white text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap">
        상담하기
      </span>
    </div>
  );
}
