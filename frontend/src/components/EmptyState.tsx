import { ArrowLeft, BookOpen, ShieldCheck } from "lucide-react";

export default function EmptyState() {
  return (
    <section className="panel flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700"
        aria-hidden="true"
      >
        <ShieldCheck size={28} strokeWidth={1.6} />
      </div>

      <h2 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">
        Answers with evidence, not assumptions.
      </h2>

      <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
        TruthGuard compares retrieved documents, identifies conflicting
        statements, checks document staleness, and shows the evidence
        behind its conclusions.
      </p>

      <div className="mt-7 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
        <BookOpen
          size={20}
          className="mt-0.5 shrink-0 text-slate-600"
          aria-hidden="true"
        />

        <div>
          <p className="text-sm font-medium text-slate-900">
            Start with the seed corpus
          </p>

          <p className="mt-1 text-sm leading-5 text-slate-600">
            Use the &quot;Load seed corpus&quot; button in the Corpus panel,
            then choose a sample question or enter your own.
          </p>
        </div>

        <ArrowLeft
          size={18}
          className="mt-0.5 shrink-0 text-slate-500"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}