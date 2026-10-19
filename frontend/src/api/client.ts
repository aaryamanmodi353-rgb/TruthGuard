import type {
  AskResponse,
  DeleteDocumentResponse,
  DocumentMeta,
  HealthResponse,
  SeedQuestion,
  SeedResponse,
} from "../types";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (typeof payload === "object" && payload !== null) {
    const body = payload as Record<string, unknown>;

    if (typeof body.error === "string") {
      return body.error;
    }

    if (typeof body.detail === "string") {
      return body.detail;
    }

    if (typeof body.message === "string") {
      return body.message;
    }
  }

  return null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to connect to the TruthGuard API.";

    throw new ApiError(
      `Network request failed: ${message}. Check that the backend is running.`,
      0,
    );
  }

  const responseText = await response.text();
  let payload: unknown = null;

  if (responseText.trim()) {
    try {
      payload = JSON.parse(responseText) as unknown;
    } catch {
      payload = responseText;
    }
  }

  if (!response.ok) {
    const message =
      extractErrorMessage(payload) ??
      `Request failed with HTTP status ${response.status}.`;

    throw new ApiError(message, response.status);
  }

  if (payload === null) {
    return undefined as T;
  }

  return payload as T;
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}

export async function seedCorpus(): Promise<SeedResponse> {
  return request<SeedResponse>("/api/seed", {
    method: "POST",
  });
}

export async function getDocuments(): Promise<DocumentMeta[]> {
  const response = await request<
    DocumentMeta[] | { documents: DocumentMeta[] }
  >("/api/documents");

  return Array.isArray(response) ? response : response.documents;
}

export async function uploadDocuments(
  files: File[],
): Promise<DocumentMeta[]> {
  const formData = new FormData();

  for (const file of files) {
    formData.append("files", file);
  }

  const response = await request<
    DocumentMeta[] | { documents: DocumentMeta[] }
  >("/api/documents", {
    method: "POST",
    body: formData,
  });

  return Array.isArray(response) ? response : response.documents;
}

export async function deleteDocument(
  docId: string,
): Promise<DeleteDocumentResponse> {
  return request<DeleteDocumentResponse>(
    `/api/documents/${encodeURIComponent(docId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function getSeedQuestions(): Promise<SeedQuestion[]> {
  const response = await request<
    SeedQuestion[] | { questions: SeedQuestion[] }
  >("/api/seed/questions");

  return Array.isArray(response) ? response : response.questions;
}

export async function askQuestion(
  question: string,
  signal?: AbortSignal,
): Promise<AskResponse> {
  return request<AskResponse>("/api/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
    signal,
  });
}