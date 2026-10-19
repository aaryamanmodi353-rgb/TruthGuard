import {
  useMemo,
  useRef,
  useState
} from "react";

import {
  BookOpen,
  CheckCircle2,
  FileText,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  Trash2,
  Upload
} from "lucide-react";

import {
  ApiError,
  deleteDocument,
  seedCorpus,
  uploadDocuments
} from "../api/client";

import type {
  DocumentMeta,
  HealthResponse
} from "../types";

import ErrorNotice from "./ErrorNotice";

interface CorpusPanelProps {
  documents: DocumentMeta[];
  health: HealthResponse | null;
  onCorpusUpdated: () => Promise<void>;
}

type CorpusAction = "seed" | "upload" | null;

interface PanelError {
  message: string;
  status?: number;
}

function normalizeError(error: unknown): PanelError {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      status: error.status
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return {
    message: "An unexpected error occurred."
  };
}

function isSupportedFile(file: File): boolean {
  return /\.(md|txt)$/i.test(file.name);
}

export default function CorpusPanel({
  documents,
  health,
  onCorpusUpdated
}: CorpusPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [action, setAction] = useState<CorpusAction>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<PanelError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isBusy = action !== null || deletingDocId !== null;

  const supersededIds = useMemo(() => {
    const ids = new Set<string>();

    for (const document of documents) {
      for (const supersededId of document.supersedes) {
        ids.add(supersededId);
      }
    }

    return ids;
  }, [documents]);

  const groupedDocuments = useMemo(() => {
    const groups = new Map<string, DocumentMeta[]>();

    for (const document of documents) {
      const existing = groups.get(document.family) ?? [];
      existing.push(document);
      groups.set(document.family, existing);
    }

    return Array.from(groups.entries())
      .map(([family, familyDocuments]) => [
        family,
        [...familyDocuments].sort((a, b) =>
          a.title.localeCompare(b.title)
        )
      ] as const)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [documents]);

  const documentCount = health?.documents ?? documents.length;

  const chunkCount =
    health?.chunks ??
    documents.reduce(
      (total, document) => total + document.chunk_count,
      0
    );

  async function handleSeed(): Promise<void> {
    setError(null);
    setFeedback(null);
    setAction("seed");

    try {
      const response = await seedCorpus();

      await onCorpusUpdated();

      setFeedback(
        `Seed corpus loaded: ${response.documents} documents and ${response.chunks} chunks.`
      );
    } catch (requestError: unknown) {
      setError(normalizeError(requestError));
    } finally {
      setAction(null);
    }
  }

  async function handleUpload(files: File[]): Promise<void> {
    if (files.length === 0) {
      return;
    }

    setError(null);
    setFeedback(null);

    const unsupportedFiles = files.filter(
      (file) => !isSupportedFile(file)
    );

    if (unsupportedFiles.length > 0) {
      setError({
        message:
          "Only .md and .txt files are supported. No files were uploaded."
      });
      return;
    }

    setAction("upload");

    try {
      const uploadedDocuments = await uploadDocuments(files);

      await onCorpusUpdated();

      setFeedback(
        `Upload complete: ${uploadedDocuments.length} document(s) processed.`
      );
    } catch (requestError: unknown) {
      setError(normalizeError(requestError));
    } finally {
      setAction(null);
    }
  }

  async function handleDelete(
    document: DocumentMeta
  ): Promise<void> {
    setError(null);
    setFeedback(null);
    setDeletingDocId(document.doc_id);

    try {
      const response = await deleteDocument(document.doc_id);

      await onCorpusUpdated();

      setFeedback(`Deleted document: ${response.deleted}`);
    } catch (requestError: unknown) {
      setError(normalizeError(requestError));
    } finally {
      setDeletingDocId(null);
    }
  }

  function handleFilePickerChange(
    event: React.ChangeEvent<HTMLInputElement>
  ): void {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);

    input.value = "";

    void handleUpload(files);
  }

  function handleDrop(
    event: React.DragEvent<HTMLDivElement>
  ): void {
    event.preventDefault();
    setIsDragging(false);

    if (isBusy) {
      return;
    }

    const files = Array.from(event.dataTransfer.files);

    if (files.length > 0) {
      void handleUpload(files);
    }
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700"
              aria-hidden="true"
            >
              <BookOpen size={21} strokeWidth={1.8} />
            </div>

            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-950">
                Document corpus
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Manage your source documents
              </p>
            </div>
          </div>

          <button
            type="button"
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              setError(null);
              setFeedback(null);
              void onCorpusUpdated();
            }}
            disabled={isBusy}
            aria-label="Refresh document corpus"
            title="Refresh corpus"
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">
              Documents
            </p>

            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">
              {documentCount}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">
              Indexed chunks
            </p>

            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">
              {chunkCount}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="primary-button mt-4 w-full"
          disabled={isBusy}
          onClick={() => void handleSeed()}
        >
          {action === "seed" ? (
            <LoaderCircle size={17} aria-hidden="true" />
          ) : (
            <RefreshCw size={16} aria-hidden="true" />
          )}

          {action === "seed"
            ? "Loading seed corpus..."
            : "Load seed corpus"}
        </button>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Loading the seed corpus replaces the existing corpus with the
          predefined Northwind Labs documents.
        </p>
      </div>

      <div className="border-b border-slate-200 p-5">
        <h3 className="section-heading">Add documents</h3>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Upload Markdown or plain-text files containing YAML
          front-matter.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,text/plain,text/markdown"
          multiple
          disabled={isBusy}
          className="sr-only"
          aria-label="Choose Markdown or text documents"
          onChange={handleFilePickerChange}
        />

        <div
          className={`mt-4 rounded-lg border border-dashed p-5 text-center ${
            isDragging
              ? "border-slate-500 bg-slate-100"
              : "border-slate-300 bg-white"
          }`}
          onDragEnter={(event) => {
            event.preventDefault();

            if (!isBusy) {
              setIsDragging(true);
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
        >
          <Upload
            size={22}
            className="mx-auto text-slate-500"
            aria-hidden="true"
          />

          <p className="mt-3 text-sm font-medium text-slate-800">
            Drop files here
          </p>

          <p className="mt-1 text-xs text-slate-500">
            .md and .txt · Multiple files supported
          </p>

          <button
            type="button"
            className="secondary-button mt-4"
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            <FolderOpen size={16} aria-hidden="true" />
            {action === "upload" ? "Uploading..." : "Choose files"}
          </button>
        </div>

        {action === "upload" && (
          <p role="status" className="mt-3 text-xs text-slate-600">
            Uploading documents and waiting for the API response...
          </p>
        )}

        {error && (
          <div className="mt-4">
            <ErrorNotice
              message={error.message}
              status={error.status}
            />
          </div>
        )}

        {feedback && (
          <p
            role="status"
            className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-700"
          >
            <CheckCircle2
              size={16}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span>{feedback}</span>
          </p>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="section-heading">Indexed documents</h3>

          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium tabular-nums text-slate-600">
            {documents.length}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="mt-4 rounded-lg border border-slate-200 px-4 py-7 text-center">
            <FileText
              size={23}
              className="mx-auto text-slate-400"
              aria-hidden="true"
            />

            <p className="mt-3 text-sm font-medium text-slate-800">
              No documents loaded
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Load the seed corpus or upload your own documents to begin.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {groupedDocuments.map(([family, familyDocuments]) => (
              <section key={family}>
                <h4 className="mb-2 break-words text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {family}
                </h4>

                <ul className="space-y-2">
                  {familyDocuments.map((document) => {
                    const isSuperseded = supersededIds.has(
                      document.doc_id
                    );

                    const isDeleting =
                      deletingDocId === document.doc_id;

                    return (
                      <li
                        key={document.doc_id}
                        className="rounded-lg border border-slate-200 p-3"
                      >
                        <div className="flex items-start gap-2">
                          <FileText
                            size={17}
                            className="mt-0.5 shrink-0 text-slate-500"
                            aria-hidden="true"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-medium leading-5 text-slate-900">
                              {document.title}
                            </p>

                            <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                              {document.version} · {document.doc_type}
                            </p>

                            <p className="text-xs leading-5 text-slate-500">
                              Effective {document.effective_date}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {isSuperseded && (
                                <span className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                  Superseded
                                </span>
                              )}

                              <span className="text-[11px] text-slate-500">
                                {document.chunk_count}{" "}
                                {document.chunk_count === 1
                                  ? "chunk"
                                  : "chunks"}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="shrink-0 rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={isBusy}
                            onClick={() => void handleDelete(document)}
                            aria-label={`Delete ${document.title}`}
                            title={`Delete ${document.title}`}
                          >
                            {isDeleting ? (
                              <LoaderCircle
                                size={16}
                                aria-hidden="true"
                              />
                            ) : (
                              <Trash2
                                size={16}
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}