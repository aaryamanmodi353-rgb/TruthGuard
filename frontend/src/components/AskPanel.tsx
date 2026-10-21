import {
  useEffect,
  useState
} from "react";

import {
  ArrowRight,
  Check,
  Circle,
  LoaderCircle,
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
    <section className="tg-studio panel overflow-hidden">
      <div className="tg-studio-heading">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="tg-panel-title">
              Ask a question
            </h2>

            <p className="tg-body mt-2 text-xs">
              Get an answer with traceable evidence and conflict analysis
            </p>
          </div>
        </div>
      </div>

      <div className="tg-studio-content">
        <form onSubmit={handleSubmit}>
          <div className="tg-editor">
            <label htmlFor="truthguard-question" className="tg-input-label">
              Your question
            </label>

            <textarea
              id="truthguard-question"
              name="question"
              className="tg-input text-input min-h-[126px] resize-y leading-6"
              placeholder="For example: How many days of annual leave do I get?"
              value={question}
              maxLength={MAX_QUESTION_LENGTH}
              disabled={loading}
              onChange={(event) => setQuestion(event.target.value)}
              aria-describedby="question-counter question-guidance"
              required
            />

            <div className="tg-editor-meta">
              <p id="question-guidance">Grounded in your indexed corpus</p>
              <p
                id="question-counter"
                className={question.length >= MAX_QUESTION_LENGTH ? "text-red-700" : ""}
                aria-live="polite"
              >
                {question.length}/{MAX_QUESTION_LENGTH}
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="tg-button primary-button mt-4 w-full sm:w-auto"
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
          <div className="tg-samples">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="tg-label">
                Try a sample question
              </h3>

              <span className="text-xs text-slate-500">
                From the seed corpus
              </span>
            </div>

            <div className="tg-sample-grid">
              {seedQuestions.map((seedQuestion, index) => (
                <button
                  key={`${seedQuestion.question}-${index}`}
                  type="button"
                  className="tg-sample-card group max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                  onClick={() => setQuestion(seedQuestion.question)}
                  title={`Expected status: ${seedQuestion.expected_status}`}
                >
                  <span className="block">
                    {seedQuestion.question}
                  </span>

                  <span className={`tg-badge ${seedQuestion.expected_status === "consistent" ? "" : "tg-badge--neutral"}`}>
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
