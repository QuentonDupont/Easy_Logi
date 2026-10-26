import { requireKind } from "@/lib/guards";
import { accountKind } from "@/lib/auth";
import { accountRequirements } from "@/lib/documents/requirements";
import { accountDocuments } from "@/lib/documents/store";
import { DocumentUploadRow } from "@/components/document-upload";

export const dynamic = "force-dynamic";

/**
 * Account-level documents, uploaded once and reused on every order: a business's customs and
 * company registration, or an individual's ID and proof of address. Orders can't be placed
 * (moved past "quoted") until the required ones are on file.
 */
export default async function DocumentsPage() {
  const profile = await requireKind(["business", "individual"]);
  const isIndividual = accountKind(profile) === "individual";
  const reqs = accountRequirements(profile.accountType);
  const files = accountDocuments(profile.orgId);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{isIndividual ? "My documents" : "Company documents"}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {isIndividual
            ? "Upload these once. We use them for every order you place — the name on your ID must match the name on the invoice and the delivery."
            : `Upload these once for ${profile.orgName ?? "your company"}. Every order uses them — the legal name must match the consignee on the invoice and the bill of lading.`}
        </p>
      </div>

      <ul className="list-none space-y-2 p-0">
        {reqs.map((req) => (
          <DocumentUploadRow
            key={req.key}
            orderId={null}
            req={req}
            files={files
              .filter((f) => f.doc_key === req.key)
              .map((f) => ({ id: f.id, filename: f.filename, created_at: f.created_at, status: f.status }))}
            canUpload={req.uploader === "customer"}
          />
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        Files are stored against your account and marked “received — not yet checked” until Easy Logi verifies them.
        PDF, JPG, PNG or WebP, up to 10 MB.
      </p>
    </div>
  );
}
