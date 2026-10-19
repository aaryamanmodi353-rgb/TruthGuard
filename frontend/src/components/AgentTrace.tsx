import { Activity, ChevronDown, Clock3, FileSearch, GitBranch, ShieldCheck, Sparkles } from "lucide-react";
import type { Trace } from "../types";

interface AgentTraceProps {
  trace: Trace;
}

function formatJson(value: unknown): string {
  const formatted = JSON.stringify(value, null, 2);
  return formatted ?? String(value);
}

function formatMilliseconds(value: number): string {
  return `${value.toFixed(2)} ms`;
}

export default function AgentTrace({ trace }: AgentTraceProps) {
  const timings = [
    { label: "Retriever", value: trace.timings_ms.retriever },
    { label: "Synthesizer", value: trace.timings_ms.synthesizer },
    { label: "Critic", value: trace.timings_ms.critic },
    { label: "Resolution", value: trace.timings_ms.resolution },
  ];

  const maxTiming = Math.max(
    1,
    trace.timings_ms.total,
    ...timings.map((timing) => timing.value),
  );

  return (
    <details className="panel group" aria-labelledby="agent-trace-heading">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <Activity
              className="h-5 w-5 text-slate-700"
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0">
            <h2 id="agent-trace-heading" className="section-heading">
              Agent execution trace
            </h2>
            <p className="muted-text mt-1">
              Inspect retrieval, synthesis, criticism, resolution, and timings.
            </p>
          </div>
        </div>

        <ChevronDown
          className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="mt-5 space-y-5 border-t border-slate-200 pt-5">
        <section
          className="rounded-lg border border-slate-200 p-4"
          aria-labelledby="trace-timing-heading"
        >
          <div className="mb-4 flex items-center gap-2">
            <Clock3
              className="h-4 w-4 text-slate-600"
              aria-hidden="true"
            />
            <h3
              id="trace-timing-heading"
              className="text-sm font-semibold text-slate-800"
            >
              Stage timings
            </h3>
          </div>

          <div className="space-y-3">
            {timings.map((timing) => {
              const percentage = Math.min(
                100,
                Math.max(0, (timing.value / maxTiming) * 100),
              );

              return (
                <div key={timing.label}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-600">
                      {timing.label}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-slate-700">
                      {formatMilliseconds(timing.value)}
                    </span>
                  </div>

                  <div
                    className="h-2 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label={`${timing.label} duration`}
                    aria-valuemin={0}
                    aria-valuemax={maxTiming}
                    aria-valuenow={timing.value}
                  >
                    <div
                      className="h-full rounded-full bg-slate-600"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-sm font-semibold text-slate-800">
              Total execution time
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
              {formatMilliseconds(trace.timings_ms.total)}
            </span>
          </div>
        </section>

        <section
          className="rounded-lg border border-slate-200 p-4"
          aria-labelledby="trace-retriever-heading"
        >
          <div className="mb-3 flex items-center gap-2">
            <FileSearch
              className="h-4 w-4 text-slate-600"
              aria-hidden="true"
            />
            <h3
              id="trace-retriever-heading"
              className="text-sm font-semibold text-slate-800"
            >
              1. Retriever
            </h3>
          </div>

          <p className="mb-3 text-xs text-slate-500">
            Retrieved candidates and their reported relevance scores.
          </p>

          {trace.retriever.candidates.length === 0 ? (
            <p className="text-sm text-slate-500">
              No retriever candidates were returned.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-medium">Chunk ID</th>
                    <th className="px-3 py-2 font-medium">Document ID</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trace.retriever.candidates.map((candidate, index) => (
                    <tr
                      key={`${candidate.chunk_id}-${candidate.doc_id}-${index}`}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="break-all px-3 py-2 font-mono text-xs text-slate-700">
                        {candidate.chunk_id}
                      </td>
                      <td className="break-all px-3 py-2 font-mono text-xs text-slate-700">
                        {candidate.doc_id}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-slate-800">
                        {candidate.score.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section
          className="rounded-lg border border-slate-200 p-4"
          aria-labelledby="trace-synthesizer-heading"
        >
          <div className="mb-3 flex items-center gap-2">
            <Sparkles
              className="h-4 w-4 text-slate-600"
              aria-hidden="true"
            />
            <h3
              id="trace-synthesizer-heading"
              className="text-sm font-semibold text-slate-800"
            >
              2. Synthesizer
            </h3>
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Draft answer
          </p>
          <div className="whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            {trace.synthesizer.draft_answer || "No draft answer was returned."}
          </div>

          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Draft claims
          </p>

          {trace.synthesizer.claims.length === 0 ? (
            <p className="text-sm text-slate-500">
              No draft claims were returned.
            </p>
          ) : (
            <ul className="space-y-2">
              {trace.synthesizer.claims.map((claim, index) => (
                <li
                  key={`${index}-${claim.text}`}
                  className="rounded-md border border-slate-200 p-3"
                >
                  <p className="text-sm leading-6 text-slate-700">
                    {claim.text}
                  </p>
                  <div className="mt-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        claim.supported
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {claim.supported ? "Supported" : "Unsupported"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="rounded-lg border border-slate-200 p-4"
          aria-labelledby="trace-critic-heading"
        >
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck
              className="h-4 w-4 text-slate-600"
              aria-hidden="true"
            />
            <h3
              id="trace-critic-heading"
              className="text-sm font-semibold text-slate-800"
            >
              3. Critic
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h4 className="text-sm font-medium text-slate-700">
                  Contradictions
                </h4>
                <span className="text-xs text-slate-500">
                  {trace.critic.contradictions.length}
                </span>
              </div>

              {trace.critic.contradictions.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No contradictions were reported by the critic.
                </p>
              ) : (
                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-700">
                  {formatJson(trace.critic.contradictions)}
                </pre>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h4 className="text-sm font-medium text-slate-700">
                  Staleness findings
                </h4>
                <span className="text-xs text-slate-500">
                  {trace.critic.stale.length}
                </span>
              </div>

              {trace.critic.stale.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No stale documents were reported by the critic.
                </p>
              ) : (
                <div className="space-y-2">
                  {trace.critic.stale.map((finding, index) => (
                    <div
                      key={`${finding.stale_doc_id}-${finding.superseded_by_doc_id}-${index}`}
                      className="rounded-md bg-slate-50 p-3"
                    >
                      <p className="break-all text-xs leading-5 text-slate-700">
                        <span className="font-semibold">Stale:</span>{" "}
                        {finding.stale_doc_id}
                      </p>
                      <p className="mt-1 break-all text-xs leading-5 text-slate-700">
                        <span className="font-semibold">Superseded by:</span>{" "}
                        {finding.superseded_by_doc_id}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Basis: {finding.basis}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h4 className="text-sm font-medium text-slate-700">
                  Unsupported claims
                </h4>
                <span className="text-xs text-slate-500">
                  {trace.critic.unsupported_claims.length}
                </span>
              </div>

              {trace.critic.unsupported_claims.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No unsupported claims were reported by the critic.
                </p>
              ) : (
                <ul className="space-y-2">
                  {trace.critic.unsupported_claims.map((claim, index) => (
                    <li
                      key={`${index}-${claim}`}
                      className="rounded-md border border-amber-200 bg-amber-50/50 p-3 text-sm leading-6 text-slate-700"
                    >
                      {claim}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section
          className="rounded-lg border border-slate-200 p-4"
          aria-labelledby="trace-resolution-heading"
        >
          <div className="mb-3 flex items-center gap-2">
            <GitBranch
              className="h-4 w-4 text-slate-600"
              aria-hidden="true"
            />
            <h3
              id="trace-resolution-heading"
              className="text-sm font-semibold text-slate-800"
            >
              4. Resolution
            </h3>
          </div>

          {trace.resolution.decisions.length === 0 ? (
            <p className="text-sm text-slate-500">
              No resolution decisions were returned.
            </p>
          ) : (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-700">
              {formatJson(trace.resolution.decisions)}
            </pre>
          )}
        </section>
      </div>
    </details>
  );
}