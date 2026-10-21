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
import { ShieldCheck } from "lucide-react";

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
    <div className="tg-app min-h-screen bg-slate-50">
      <Header />

      <div className="tg-main">
        {error && (
          <div className="mb-6">
            <ErrorNotice
              message={error.message}
              status={error.status}
            />
          </div>
        )}

        <section className="tg-intro" aria-labelledby="workspace-title">
          <div className="tg-intro-copy">
            <p className="tg-eyebrow">Workspace / Northwind Labs</p>
            <h1 id="workspace-title" className="tg-title">
              Clarity starts with evidence.
            </h1>
            <p className="tg-body">
              Ask your documents. Trace every answer. Surface what doesn’t agree.
            </p>
          </div>

          <div className="tg-scene" aria-hidden="true">
            <div className="tg-document-stack">
              <div className="tg-sheet tg-sheet--back" />
              <div className="tg-sheet tg-sheet--middle" />
              <div className="tg-sheet tg-sheet--front">
                <ShieldCheck />
                <span className="tg-document-line tg-document-line--title" />
                <span className="tg-document-line" />
                <span className="tg-document-line tg-document-line--short" />
              </div>
            </div>
            <div className="tg-source-chip">
              <ShieldCheck aria-hidden="true" />
              <span>Source verified</span>
            </div>
          </div>
        </section>

        <div className="tg-columns">
          <aside className="min-w-0">
            <CorpusPanel
              documents={documents}
              health={health}
              onCorpusUpdated={refreshCorpus}
            />
          </aside>

          <main className="tg-results min-w-0">
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

        <footer className="tg-footer">
          <p>
            TruthGuard · Document-grounded answers with transparent
            verification.
          </p>
        </footer>
      </div>
    </div>
  );
}
