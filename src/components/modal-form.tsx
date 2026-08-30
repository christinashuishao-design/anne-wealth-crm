"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { CheckCircle2, Plus, X } from "lucide-react";

const ModalFormContext = createContext<(() => void) | null>(null);

export function useModalFormComplete() {
  const complete = useContext(ModalFormContext);
  if (!complete) throw new Error("useModalFormComplete must be used inside ModalForm");
  return complete;
}

export function ModalForm({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const complete = useCallback(() => {
    setOpen(false);
    setSaved(true);
  }, []);

  function openFreshForm() {
    setSession((value) => value + 1);
    setSaved(false);
    setOpen(true);
  }

  return (
    <>
      <button
        className="flex items-center gap-2 rounded-xl bg-[#173b34] px-4 py-2.5 text-sm text-white"
        onClick={openFreshForm}
        type="button"
      >
        <Plus size={16} />
        {title}
      </button>
      {saved && (
        <div className="fixed right-5 top-5 z-[90] flex items-center gap-2 rounded-xl bg-[#173b34] px-4 py-3 text-sm text-white shadow-xl">
          <CheckCircle2 size={18} />
          任务已保存，表单已清空
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-2xl"
            key={session}
          >
            <div className="flex justify-between border-b p-5">
              <h2 className="text-lg font-semibold text-[#173b34]">{title}</h2>
              <button
                aria-label="关闭"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X />
              </button>
            </div>
            <ModalFormContext.Provider value={complete}>
              <div className="p-5">{children}</div>
            </ModalFormContext.Provider>
          </div>
        </div>
      )}
    </>
  );
}
