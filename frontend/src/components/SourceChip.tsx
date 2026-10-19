import { useState } from "react";

import {
  ChevronDown,
  ChevronUp,
  FileText
} from "lucide-react";

import type { Source } from "../types";

interface SourceChipProps {
  source: Source;
}

export default function SourceChip({
  source
}: SourceChipProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="min-w-0 max-w-full">
      <button
        type="button"
        className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
      >
        <FileText
          size={15}
          className="shrink-0 text-slate-500"
          aria-hidden="true"
        />

        <span className="min-w-0 break-words leading-5">
          <span className="font-medium">{source.title}</span>
          <span className="text-slate-500">
            {" "}
            · {source.version} · {source.effective_date}
          </span>
        </span>

        {expanded ? (
          <ChevronUp
            size={14}
            className="shrink-0 text-slate-500"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            size={14}
            className="shrink-0 text-slate-500"
            aria-hidden="true"
          />
        )}
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600">
              {source.doc_type}
            </span>

            <span className="break-all text-[11px] text-slate-500">
              {source.chunk_id}
            </span>
          </div>

          <h4 className="mt-3 text-xs font-semibold text-slate-800">
            Source quotation
          </h4>

          <blockquote className="mt-2 whitespace-pre-wrap break-words border-l-2 border-slate-300 pl-3 text-xs leading-6 text-slate-700">
            {source.quote}
          </blockquote>
        </div>
      )}
    </div>
  );
}