import { AlertTriangle, ArrowRight, FileText } from "lucide-react";
import type { StalenessFinding } from "../types";

interface StalenessListProps {
  findings: StalenessFinding[];
}

function getBasisLabel(basis: StalenessFinding["basis"]): string {
  switch (basis) {
    case "explicit_supersedes":
      return "Explicit supersession link";
    case "newer_version_same_family":
      return "Newer version in the same document family";
    default:
      return basis;
  }
}

export default function StalenessList({
  findings,
}: StalenessListProps) {
  return (
    <section className="panel" aria-labelledby="staleness-heading">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="staleness-heading" className="section-heading">
            Document staleness
          </h2>
          <p className="muted-text mt-1">
            Documents flagged as stale and their identified replacements.
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            findings.length > 0
              ? "bg-amber-50 text-amber-800"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {findings.length} {findings.length === 1 ? "finding" : "findings"}
        </span>
      </div>

      {findings.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <FileText
            className="h-5 w-5 shrink-0 text-slate-400"
            aria-hidden="true"
          />
          <p className="text-sm text-slate-600">
            No staleness findings were reported for this answer.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {findings.map((finding, index) => (
            <article
              key={`${finding.stale_doc_id}-${finding.superseded_by_doc_id}-${index}`}
              className="rounded-lg border border-amber-200 bg-amber-50/50 p-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      Stale document
                    </span>
                    <span className="break-all rounded border border-amber-200 bg-white px-2 py-1 font-mono text-xs text-slate-700">
                      {finding.stale_doc_id}
                    </span>
                  </div>

                  <div className="my-3 flex flex-wrap items-center gap-2 pl-0.5 text-slate-500">
                    <ArrowRight
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-medium">
                      Superseded by
                    </span>
                    <span className="break-all rounded border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono text-xs text-emerald-800">
                      {finding.superseded_by_doc_id}
                    </span>
                  </div>

                  <p className="text-xs leading-5 text-slate-600">
                    <span className="font-semibold">Detection basis:</span>{" "}
                    {getBasisLabel(finding.basis)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}