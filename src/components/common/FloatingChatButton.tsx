"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Image from "next/image";

declare global {
  interface Window {
    Kakao: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Channel: {
        chat: (options: { channelPublicId: string }) => void;
      };
    };
  }
}

export function FloatingChatButton() {
  const [isKakaoReady, setIsKakaoReady] = useState(false);

  const kakaoJsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  const channelId = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_ID;

  useEffect(() => {
    if (window.Kakao && !window.Kakao.isInitialized() && kakaoJsKey) {
      window.Kakao.init(kakaoJsKey);
      setIsKakaoReady(true);
    }
  }, [kakaoJsKey]);

  const handleKakaoSDKLoad = () => {
    if (window.Kakao && !window.Kakao.isInitialized() && kakaoJsKey) {
      window.Kakao.init(kakaoJsKey);
      setIsKakaoReady(true);
    }
  };

  const handleChatClick = () => {
    if (!channelId) {
      console.error("카카오 채널 ID가 설정되지 않았습니다.");
      return;
    }

    // 카카오톡 채널 페이지로 이동
    window.open(`https://pf.kakao.com/${channelId}`, "_blank");
  };

  return (
    <>
      <Script
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
        integrity="sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxu4yyC7wy6K1Ber6nam"
        crossOrigin="anonymous"
        onLoad={handleKakaoSDKLoad}
        strategy="afterInteractive"
      />
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleChatClick}
          className="w-14 h-14 bg-[#FEE500] rounded-full flex items-center justify-center shadow-lg hover:bg-[#F5DC00] transition-colors"
          aria-label="카카오톡 상담하기"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 3C6.47715 3 2 6.58172 2 11C2 13.7614 3.69067 16.1861 6.24999 17.6245L5.24999 21L9.12499 18.75C10.0416 18.9149 10.9999 19 12 19C17.5228 19 22 15.4183 22 11C22 6.58172 17.5228 3 12 3Z"
              fill="#3C1E1E"
            />
          </svg>
        </button>
        <span className="absolute -top-1 -right-1 bg-damda-teal text-white text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap">
          상담하기
        </span>
      </div>
    </>
  );
}
