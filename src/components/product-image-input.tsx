"use client";

import { useState } from "react";

const maximumSize = 5 * 1024 * 1024;

export function ProductImageInput({ className = "" }: { className?: string }) {
  const [error, setError] = useState("");
  return (
    <div>
      <input
        aria-label="产品图片"
        accept="image/jpeg,image/png,image/webp"
        className={className}
        name="image"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && file.size > maximumSize) {
            event.target.value = "";
            setError("图片超过5MB，请压缩后重新选择。支持JPG、PNG和WebP。 ");
          } else setError("");
        }}
        type="file"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
