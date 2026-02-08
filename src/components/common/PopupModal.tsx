"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { Popup } from "@/services/popupService";
import { Checkbox } from "@/components/ui/checkbox";

interface PopupItemProps {
  popup: Popup;
  onClose: () => void;
  index: number;
}

const STORAGE_KEY_PREFIX = "popup_hidden_until_";

function isHiddenToday(popupId: string): boolean {
  if (typeof window === "undefined") return false;
  const hiddenUntil = localStorage.getItem(`${STORAGE_KEY_PREFIX}${popupId}`);
  if (!hiddenUntil) return false;
  return new Date(hiddenUntil) > new Date();
}

function hideUntilTomorrow(popupId: string): void {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${popupId}`, tomorrow.toISOString());
}

function PopupItem({ popup, onClose, index }: PopupItemProps) {
  const [dontShowToday, setDontShowToday] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  const handleClose = () => {
    if (dontShowToday) {
      hideUntilTomorrow(popup.id);
    }
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleDontShowToday = () => {
    hideUntilTomorrow(popup.id);
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const width = popup.width || 320;
  const height = popup.height || 400;

  const imageContent = popup.image_url ? (
    <div className="relative" style={{ width, height }}>
      <Image
        src={popup.image_url}
        alt={popup.title}
        fill
        className="object-cover"
      />
    </div>
  ) : null;

  return (
    <div
      className={`bg-white shadow-xl overflow-hidden transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{ width }}
    >
      {/* 이미지 (링크 있으면 클릭 가능) */}
      {popup.link_url ? (
        <Link href={popup.link_url}>{imageContent}</Link>
      ) : (
        imageContent
      )}

      {/* 하단 버튼 영역 */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={dontShowToday}
            onCheckedChange={(checked) => {
              if (checked) {
                handleDontShowToday();
              } else {
                setDontShowToday(false);
              }
            }}
          />
          <span className="text-xs text-gray-600">오늘 하루 보지 않기</span>
        </label>
        <button
          onClick={handleClose}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
        >
          <X className="w-4 h-4" />
          닫기
        </button>
      </div>
    </div>
  );
}

interface PopupContainerProps {
  popups: Popup[];
}

export function PopupContainer({ popups }: PopupContainerProps) {
  const [visiblePopups, setVisiblePopups] = useState<Popup[]>([]);

  useEffect(() => {
    const filtered = popups.filter((popup) => !isHiddenToday(popup.id));
    setVisiblePopups(filtered);
  }, [popups]);

  const handleClose = (popupId: string) => {
    setVisiblePopups((prev) => prev.filter((p) => p.id !== popupId));
  };

  if (visiblePopups.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 z-50 flex flex-row gap-2">
      {visiblePopups.map((popup, index) => (
        <PopupItem
          key={popup.id}
          popup={popup}
          onClose={() => handleClose(popup.id)}
          index={index}
        />
      ))}
    </div>
  );
}
