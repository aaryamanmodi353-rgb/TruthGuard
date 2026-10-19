import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  Scale
} from "lucide-react";

import type { Conflict } from "../types";

import SourceChip from "./SourceChip";

interface ConflictViewProps {
  conflicts: Conflict[];
}

export default function ConflictView({
  conflicts
}: ConflictViewProps) {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700"
          aria-hidden="true"
        >
          <Scale size={19} />
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-950">
            Conflict analysis
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Inspect each conflicting position, its source, and the
            resolution decision.
          </p>
        </div>

        <span className="ml-auto shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium tabular-nums text-slate-600">
          {conflicts.length}
        </span>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {conflicts.map((conflict, conflictIndex) => {
          const isUnresolvable =
            conflict.resolution.type === "unresolvable";

          const winningDocId =
            conflict.resolution.winning_doc_id;

          return (
            <article
              key={conflict.conflict_id}
              className={
                conflictIndex > 0
                  ? "border-t border-slate-200 pt-5"
                  : ""
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Conflict {conflictIndex + 1}
                  </p>

                  <h3 className="mt-1 break-words text-sm font-semibold leading-6 text-slate-900">
                    {conflict.topic}
                  </h3>
                </div>

                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                  {conflict.resolution.type === "superseded"
                    ? "Supersession resolution"
                    : "Unresolved"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {conflict.positions.map((position, positionIndex) => {
                  const isWinner =
                    !isUnresolvable &&
                    winningDocId !== null &&
                    position.source.doc_id === winningDocId;

                  const isStale =
                    !isUnresolvable &&
                    winningDocId !== null &&
                    position.source.doc_id !== winningDocId;

                  return (
                    <section
                      key={`${conflict.conflict_id}-${position.source.chunk_id}-${positionIndex}`}
                      className={`min-w-0 rounded-xl border p-4 ${
                        isWinner
                          ? "border-emerald-300 bg-emerald-50"
                          : isStale
                            ? "border-slate-200 bg-slate-50 opacity-80"
                            : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Position {positionIndex + 1}
                        </p>

                        {isWinner && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-[11px] font-medium text-emerald-900">
                            <CheckCircle2
                              size={13}
                              aria-hidden="true"
                            />
                            Supersedes
                          </span>
                        )}

                        {isStale && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700">
                            <FileWarning
                              size={13}
                              aria-hidden="true"
                            />
                            Superseded
                          </span>
                        )}
                      </div>

                      <p className="mt-3 break-words text-sm leading-6 text-slate-800">
                        {position.claim}
                      </p>

                      <div className="mt-4 border-t border-slate-200/80 pt-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Provenance
                        </p>

                        <SourceChip source={position.source} />
                      </div>
                    </section>
                  );
                })}
              </div>

              {isUnresolvable && (
                <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      size={18}
                      className="mt-0.5 shrink-0 text-red-700"
                      aria-hidden="true"
                    />

                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-red-950">
                        Conflict cannot be resolved
                      </h4>

                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-red-900">
                        {conflict.resolution.rationale}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!isUnresolvable && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Resolution rationale
                  </h4>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                    {conflict.resolution.rationale}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}