import { ShieldCheck } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"
          aria-hidden="true"
        >
          <ShieldCheck size={23} strokeWidth={1.8} />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-slate-950">
              TruthGuard
            </h1>

            <span className="hidden rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:inline-flex">
              Document verification
            </span>
          </div>

          <p className="mt-0.5 text-sm text-slate-600">
            Answers that show their disagreements.
          </p>
        </div>
      </div>
    </header>
  );
}