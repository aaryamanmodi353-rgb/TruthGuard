import {
  useEffect,
  useState
} from "react";

import {
  ArrowRight,
  Check,
  Circle,
  LoaderCircle,
  MessageSquareText,
  ShieldCheck
} from "lucide-react";

import type {
  AnswerStatus,
  SeedQuestion
} from "../types";

interface AskPanelProps {
  seedQuestions: SeedQuestion[];
  loading: boolean;
  onSubmit: (question: string) => Promise<void>;
}

const MAX_QUESTION_LENGTH = 500;

const PROGRESS_STEPS = [
  "Retriever",
  "Synthesizer",
  "Critic",
  "Resolution"
] as const;

const EXPECTED_STATUS_LABELS: Record<AnswerStatus, string> = {
  consistent: "Consistent",
  conflict_resolved: "Conflict resolved",
  conflict_unresolved: "Conflict unresolved",
  insufficient_evidence: "Insufficient evidence"
};

export default function AskPanel({
  seedQuestions,
  loading,
  onSubmit
}: AskPanelProps) {
  const [question, setQuestion] = useState("");
  const [progressStep, setProgressStep] = useState(0);

  const normalizedQuestion = question.trim();

  const canSubmit =
    normalizedQuestion.length > 0 &&
    normalizedQuestion.length <= MAX_QUESTION_LENGTH &&
    !loading;

  useEffect(() => {
    if (!loading) {
      setProgressStep(0);
      return;
    }

    const lastStep = PROGRESS_STEPS.length - 1;

    if (progressStep >= lastStep) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setProgressStep((currentStep) =>
        Math.min(currentStep + 1, lastStep)
      );
    }, 1400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loading, progressStep]);

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): void {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    void onSubmit(normalizedQuestion);
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700"
            aria-hidden="true"
          >
            <MessageSquareText size={21} strokeWidth={1.8} />
          </div>

          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-950">
              Ask a question
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Get an answer with traceable evidence and conflict analysis
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <form onSubmit={handleSubmit}>
          <label
            htmlFor="truthguard-question"
            className="mb-2 block text-sm font-medium text-slate-800"
          >
            Your question
          </label>

          <textarea
            id="truthguard-question"
            name="question"
            className="text-input min-h-[126px] resize-y leading-6"
            placeholder="For example: How many days of annual leave do I get?"
            value={question}
            maxLength={MAX_QUESTION_LENGTH}
            disabled={loading}
            onChange={(event) => setQuestion(event.target.value)}
            aria-describedby="question-counter question-guidance"
            required
          />

          <div className="mt-2 flex items-center justify-between gap-3">
            <p
              id="question-guidance"
              className="text-xs leading-5 text-slate-500"
            >
              Answers are grounded in the indexed document corpus.
            </p>

            <p
              id="question-counter"
              className={`shrink-0 text-xs tabular-nums ${
                question.length >= MAX_QUESTION_LENGTH
                  ? "font-medium text-red-700"
                  : "text-slate-500"
              }`}
              aria-live="polite"
            >
              {question.length}/{MAX_QUESTION_LENGTH}
            </p>
          </div>

          <button
            type="submit"
            className="primary-button mt-5 w-full sm:w-auto"
            disabled={!canSubmit}
          >
            {loading ? (
              <LoaderCircle size={17} aria-hidden="true" />
            ) : (
              <ShieldCheck size={17} aria-hidden="true" />
            )}

            {loading ? "Verifying..." : "Verify answer"}

            {!loading && (
              <ArrowRight size={16} aria-hidden="true" />
            )}
          </button>
        </form>

        {seedQuestions.length > 0 && (
          <div className="mt-7 border-t border-slate-200 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Try a sample question
              </h3>

              <span className="text-xs text-slate-500">
                From the seed corpus
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {seedQuestions.map((seedQuestion, index) => (
                <button
                  key={`${seedQuestion.question}-${index}`}
                  type="button"
                  className="group max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                  onClick={() => setQuestion(seedQuestion.question)}
                  title={`Expected status: ${seedQuestion.expected_status}`}
                >
                  <span className="block text-xs font-medium leading-5 text-slate-700">
                    {seedQuestion.question}
                  </span>

                  <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                    Expected:{" "}
                    {EXPECTED_STATUS_LABELS[
                      seedQuestion.expected_status
                    ]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div
            className="mt-7 border-t border-slate-200 pt-5"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Verification in progress
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Waiting for the complete response from the backend.
                </p>
              </div>

              <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                Step {progressStep + 1} of {PROGRESS_STEPS.length}
              </span>
            </div>

            <div
              className="mt-5 grid grid-cols-4 gap-2"
              role="progressbar"
              aria-label="Indicative verification progress"
              aria-valuemin={1}
              aria-valuemax={PROGRESS_STEPS.length}
              aria-valuenow={progressStep + 1}
              aria-valuetext={PROGRESS_STEPS[progressStep]}
            >
              {PROGRESS_STEPS.map((step, index) => {
                const isComplete = index < progressStep;
                const isCurrent = index === progressStep;

                return (
                  <div
                    key={step}
                    className="min-w-0"
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    <div
                      className={`h-1 rounded-full ${
                        isComplete || isCurrent
                          ? "bg-slate-800"
                          : "bg-slate-200"
                      }`}
                    />

                    <div className="mt-2 flex items-start gap-1">
                      {isComplete ? (
                        <Check
                          size={13}
                          className="mt-0.5 shrink-0 text-slate-700"
                          aria-hidden="true"
                        />
                      ) : isCurrent ? (
                        <LoaderCircle
                          size={13}
                          className="mt-0.5 shrink-0 text-slate-800"
                          aria-hidden="true"
                        />
                      ) : (
                        <Circle
                          size={13}
                          className="mt-0.5 shrink-0 text-slate-400"
                          aria-hidden="true"
                        />
                      )}

                      <span
                        className={`break-words text-[10px] leading-4 sm:text-xs ${
                          isCurrent
                            ? "font-semibold text-slate-900"
                            : "text-slate-500"
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              The progress indicator advances on a timer. The API does not
              stream individual agent-stage updates.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}