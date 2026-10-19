import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import Header from "./components/Header";
import CorpusPanel from "./components/CorpusPanel";
import AskPanel from "./components/AskPanel";
import StatusBanner from "./components/StatusBanner";
import AnswerCard from "./components/AnswerCard";
import ConflictView from "./components/ConflictView";
import ClaimsList from "./components/ClaimsList";
import StalenessList from "./components/StalenessList";
import AgentTrace from "./components/AgentTrace";
import EmptyState from "./components/EmptyState";
import ErrorNotice from "./components/ErrorNotice";

import {
  ApiError,
  askQuestion,
  getDocuments,
  getHealth,
  getSeedQuestions
} from "./api/client";

import type {
  AskResponse,
  DocumentMeta,
  HealthResponse,
  SeedQuestion
} from "./types";

interface AppError {
  message: string;
  status?: number;
}

function normalizeError(error: unknown): AppError {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      status: error.status
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message
    };
  }

  return {
    message: "An unexpected error occurred."
  };
}

export default function App() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [seedQuestions, setSeedQuestions] = useState<SeedQuestion[]>([]);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [asking, setAsking] = useState(false);
  const [hasSubmittedQuestion, setHasSubmittedQuestion] = useState(false);

  const askController = useRef<AbortController | null>(null);

  const refreshCorpus = useCallback(async (): Promise<void> => {
    try {
      const [healthResponse, documentResponse] = await Promise.all([
        getHealth(),
        getDocuments()
      ]);

      setHealth(healthResponse);
      setDocuments(documentResponse);
    } catch (requestError: unknown) {
      setError(normalizeError(requestError));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialize(): Promise<void> {
      try {
        const [healthResponse, documentResponse, questionsResponse] =
          await Promise.all([
            getHealth(),
            getDocuments(),
            getSeedQuestions()
          ]);

        if (cancelled) {
          return;
        }

        setHealth(healthResponse);
        setDocuments(documentResponse);
        setSeedQuestions(questionsResponse);
      } catch (requestError: unknown) {
        if (!cancelled) {
          setError(normalizeError(requestError));
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      askController.current?.abort();
      askController.current = null;
    };
  }, []);

  const handleAsk = useCallback(
    async (submittedQuestion: string): Promise<void> => {
      const normalizedQuestion = submittedQuestion.trim();

      if (
        normalizedQuestion.length === 0 ||
        normalizedQuestion.length > 500
      ) {
        return;
      }

      askController.current?.abort();

      const controller = new AbortController();
      askController.current = controller;

      setError(null);
      setResult(null);
      setAsking(true);
      setHasSubmittedQuestion(true);

      try {
        const response = await askQuestion(
          normalizedQuestion,
          controller.signal
        );

        if (
          !controller.signal.aborted &&
          askController.current === controller
        ) {
          setResult(response);
        }
      } catch (requestError: unknown) {
        if (
          !controller.signal.aborted &&
          askController.current === controller
        ) {
          setError(normalizeError(requestError));
        }
      } finally {
        if (askController.current === controller) {
          askController.current = null;
          setAsking(false);
        }
      }
    },
    []
  );

  const hasResult = result !== null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {error && (
          <div className="mb-6">
            <ErrorNotice
              message={error.message}
              status={error.status}
            />
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <aside className="min-w-0 lg:col-span-4">
            <CorpusPanel
              documents={documents}
              health={health}
              onCorpusUpdated={refreshCorpus}
            />
          </aside>

          <main className="min-w-0 space-y-6 lg:col-span-8">
            <AskPanel
              seedQuestions={seedQuestions}
              loading={asking}
              onSubmit={handleAsk}
            />

            <section
              aria-label="Question results"
              aria-live="polite"
              aria-busy={asking}
              className="min-w-0 space-y-5"
            >
              {!hasResult && !asking && !hasSubmittedQuestion && (
                <EmptyState />
              )}

              {asking && (
                <div className="panel px-5 py-8 text-center">
                  <p className="text-sm font-medium text-slate-900">
                    Verifying your question
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    The answer and verification findings will appear here
                    when processing finishes.
                  </p>
                </div>
              )}

              {result && (
                <>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Verification result
                    </p>

                    <h2 className="break-words text-base font-semibold leading-7 text-slate-950 sm:text-lg">
                      {result.question}
                    </h2>

                    <StatusBanner status={result.status} />
                  </div>

                  <AnswerCard answer={result.final_answer} />

                  {result.conflicts.length > 0 && (
                    <ConflictView conflicts={result.conflicts} />
                  )}

                  {result.claims.length > 0 && (
                    <ClaimsList
                      claims={result.claims}
                      citations={result.citations}
                    />
                  )}

                  {result.staleness_findings.length > 0 && (
                    <StalenessList
                      findings={result.staleness_findings}
                    />
                  )}

                  <AgentTrace trace={result.trace} />
                </>
              )}
            </section>
          </main>
        </div>

        <footer className="mt-10 border-t border-slate-200 pt-5">
          <p className="text-center text-xs leading-5 text-slate-500">
            TruthGuard · Document-grounded answers with transparent
            verification.
          </p>
        </footer>
      </div>
    </div>
  );
}