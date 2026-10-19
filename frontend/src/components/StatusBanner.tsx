import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Scale
} from "lucide-react";

import type { AnswerStatus } from "../types";

interface StatusBannerProps {
  status: AnswerStatus;
}

const STATUS_CONFIG = {
  consistent: {
    label: "Sources agree",
    description:
      "The retrieved sources do not contain a detected contradiction.",
    className: "border-emerald-300 bg-emerald-50 text-emerald-950",
    iconClassName: "text-emerald-700",
    Icon: CheckCircle2
  },

  conflict_resolved: {
    label: "Sources conflicted — resolved by supersession",
    description:
      "The sources disagree. The resolution identifies a superseding document.",
    className: "border-amber-300 bg-amber-50 text-amber-950",
    iconClassName: "text-amber-800",
    Icon: Scale
  },

  conflict_unresolved: {
    label: "Sources conflict — cannot be resolved",
    description:
      "The conflicting positions must be inspected separately. No winning source has been established.",
    className: "border-red-300 bg-red-50 text-red-950",
    iconClassName: "text-red-700",
    Icon: AlertTriangle
  },

  insufficient_evidence: {
    label: "Not covered by the corpus",
    description:
      "The corpus does not contain relevant information for this question.",
    className: "border-slate-300 bg-slate-100 text-slate-900",
    iconClassName: "text-slate-700",
    Icon: CircleHelp
  }
} satisfies Record<
  AnswerStatus,
  {
    label: string;
    description: string;
    className: string;
    iconClassName: string;
    Icon: typeof CheckCircle2;
  }
>;

export default function StatusBanner({
  status
}: StatusBannerProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.Icon;

  return (
    <section
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`rounded-xl border p-4 ${config.className}`}
    >
      <div className="flex items-start gap-3">
        <Icon
          size={22}
          strokeWidth={2}
          className={`mt-0.5 shrink-0 ${config.iconClassName}`}
          aria-hidden="true"
        />

        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-6">
            {config.label}
          </h2>

          <p className="mt-1 text-sm leading-6">
            {config.description}
          </p>
        </div>
      </div>
    </section>
  );
}