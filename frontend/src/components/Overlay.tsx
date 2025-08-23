import React from "react";

interface OverlayProps {
  onClose: () => void;
  children: React.ReactNode;
}

export default function Overlay({ onClose, children }: OverlayProps) {
  return (
    <div
      className="overlay"
      onClick={onClose} // 外側クリックで閉じる
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.6)", // 半透明
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()} // カード内クリックでは閉じない
        style={{
          width: "60%",
          minHeight: "60%",
          background: "#111",
          color: "#fff",
          borderRadius: "1rem",
          padding: "2rem",
        }}
      >
        {children}
      </div>
    </div>
  );
}
