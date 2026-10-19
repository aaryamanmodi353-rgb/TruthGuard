import { AlertCircle } from "lucide-react";

interface ErrorNoticeProps {
  message: string;
  status?: number;
}

export default function ErrorNotice({
  message,
  status
}: ErrorNoticeProps) {
  const isEmptyCorpusError = status === 409;

  return (
    <section
      role="alert"
      aria-live="assertive"
      className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-950"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          size={21}
          className="mt-0.5 shrink-0 text-red-700"
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">
            {isEmptyCorpusError
              ? "The document corpus is empty"
              : "Request failed"}
          </h2>

          <p className="mt-1 break-words text-sm leading-6">
            {message}
          </p>

          {isEmptyCorpusError && (
            <p className="mt-2 text-sm leading-6">
              Load the seed corpus or upload Markdown (.md) or text (.txt)
              documents from the Corpus panel before asking a question.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}