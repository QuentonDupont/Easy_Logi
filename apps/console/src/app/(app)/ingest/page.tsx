import { getCurrentProfile } from "@/lib/auth";
import { IngestConsole } from "@/components/ingest-console";

export const dynamic = "force-dynamic";

export default async function IngestPage() {
  const profile = await getCurrentProfile();
  const isOps = profile?.role === "ops_admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Catalogue ingestion</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Upload a parts CSV/XLSX (or paste CSV). Rows are normalised and checked against the
          catalogue — new, duplicate, conflict or invalid — then you publish the new ones into
          parts / cross-refs / fitments. Published parts become findable in Fitment immediately.
        </p>
      </div>
      {isOps ? (
        <IngestConsole />
      ) : (
        <p className="text-sm text-muted-foreground">Catalogue ingestion is available to ops admins only.</p>
      )}
    </div>
  );
}
