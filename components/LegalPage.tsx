import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="px-4 pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),32px)]">
      <Link href="/" className="-ml-2 inline-flex h-12 items-center px-2 text-[15px] font-medium text-sub">
        ‹ 처음으로
      </Link>
      <h1 className="mt-2 mb-6 text-[24px] font-bold">{title}</h1>
      <div className="flex flex-col gap-5 text-[15px] leading-[1.75] [&_h2]:mb-1 [&_h2]:text-[16px] [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </main>
  );
}
