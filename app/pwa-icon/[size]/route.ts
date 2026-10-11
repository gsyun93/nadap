// manifest용 PNG 아이콘: /pwa-icon/192, /pwa-icon/512
import { renderAppIcon } from "@/lib/icon-image";

const SIZES = ["192", "512"];

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }));
}

export async function GET(_req: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const { size } = await ctx.params;
  if (!SIZES.includes(size)) return new Response("Not found", { status: 404 });
  return renderAppIcon(Number(size));
}
