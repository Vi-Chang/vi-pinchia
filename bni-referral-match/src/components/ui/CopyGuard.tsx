"use client";

import { useEffect } from "react";

/**
 * 輕量防複製嚇阻（僅登入後的 App 內）：
 * - 擋滑鼠右鍵選單、擋圖片拖曳／另存
 * - 刻意「保留文字選取」，讓會員仍可複製夥伴的電話／LINE 等聯絡方式
 * 註：這只能嚇阻一般人隨手複製，無法防止截圖或開發者工具。
 */
export function CopyGuard() {
  useEffect(() => {
    const noMenu = (e: MouseEvent) => e.preventDefault();
    const noDrag = (e: DragEvent) => {
      if ((e.target as HTMLElement)?.tagName === "IMG") e.preventDefault();
    };
    document.addEventListener("contextmenu", noMenu);
    document.addEventListener("dragstart", noDrag);
    return () => {
      document.removeEventListener("contextmenu", noMenu);
      document.removeEventListener("dragstart", noDrag);
    };
  }, []);
  return null;
}
