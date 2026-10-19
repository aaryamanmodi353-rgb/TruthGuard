import { FileCheck2 } from "lucide-react";

interface AnswerCardProps {
  answer: string;
}

export default function AnswerCard({
  answer
}: AnswerCardProps) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <FileCheck2
          size={19}
          className="text-slate-600"
          aria-hidden="true"
        />

        <h2 className="text-sm font-semibold text-slate-900">
          Final answer
        </h2>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
          {answer}
        </p>
      </div>
    </section>
  );
}