import { getCurrentProfile } from "@/lib/auth";
import { documentWithBytes } from "@/lib/documents/store";

export const dynamic = "force-dynamic";

/** Download an uploaded document. Only the owning organisation (or Easy Logi staff) may read it. */
export async function GET(_req: Request, { params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Not signed in", { status: 401 });

  const doc = documentWithBytes(docId);
  if (!doc || (profile.role !== "ops_admin" && doc.org_id !== profile.orgId)) {
    return new Response("Not found", { status: 404 });
  }

  const safeName = doc.filename.replace(/[^\w.\- ]/g, "_").slice(0, 120) || "document";
  return new Response(Buffer.from(doc.data_base64, "base64"), {
    headers: {
      "Content-Type": doc.mime_type,
      "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(doc.filename.slice(0, 120))}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // Uploaded files are customer content: never let one run script on our origin. (Chrome's
      // PDF viewer refuses to render under `sandbox`, so PDFs get the restrictive policy only.)
      "Content-Security-Policy":
        doc.mime_type === "application/pdf"
          ? "default-src 'none'; object-src 'self'"
          : "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
    },
  });
}
