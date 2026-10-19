import { CheckCircle2, CircleAlert, FileText } from "lucide-react";
import type { Claim, Source } from "../types";
import SourceChip from "./SourceChip";

interface ClaimsListProps {
  claims: Claim[];
  citations: Source[];
}

export default function ClaimsList({
  claims,
  citations,
}: ClaimsListProps) {
  const sourcesByChunkId = new Map<string, Source>();

  for (const source of citations) {
    sourcesByChunkId.set(source.chunk_id, source);
  }

  return (
    <section className="panel" aria-labelledby="claims-heading">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="claims-heading" className="section-heading">
            Claim verification
          </h2>
          <p className="muted-text mt-1">
            Individual answer claims and their supporting evidence.
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {claims.length} {claims.length === 1 ? "claim" : "claims"}
        </span>
      </div>

      {claims.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
          <FileText
            className="mx-auto mb-2 h-6 w-6 text-slate-400"
            aria-hidden="true"
          />
          <p className="text-sm text-slate-600">
            No individual claims were returned for this answer.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {claims.map((claim, index) => {
            const matchedSources = claim.citations
              .map((citationId) => sourcesByChunkId.get(citationId))
              .filter((source): source is Source => source !== undefined);

            const unmatchedCitations = claim.citations.filter(
              (citationId) => !sourcesByChunkId.has(citationId),
            );

            return (
              <li
                key={`${index}-${claim.text}`}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {claim.supported ? (
                      <CheckCircle2
                        className="h-5 w-5 text-emerald-600"
                        aria-label="Supported claim"
                      />
                    ) : (
                      <CircleAlert
                        className="h-5 w-5 text-amber-600"
                        aria-label="Unsupported claim"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-6 text-slate-800">
                      {claim.text}
                    </p>

                    <div className="mt-3">
                      {claim.supported ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                          Supported by evidence
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                          Unsupported — removed from answer
                        </span>
                      )}
                    </div>

                    {matchedSources.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Matched sources
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {matchedSources.map((source) => (
                            <SourceChip
                              key={source.chunk_id}
                              source={source}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {unmatchedCitations.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Unmatched citation references
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {unmatchedCitations.map((citationId) => (
                            <span
                              key={citationId}
                              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-600"
                            >
                              {citationId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {claim.citations.length === 0 && (
                      <p className="mt-3 text-xs text-slate-500">
                        No citation references were supplied for this claim.
                      </p>
                    )}
                  </div>

                  <span className="shrink-0 text-xs text-slate-400">
                    #{index + 1}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}