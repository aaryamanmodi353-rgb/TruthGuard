export type DocumentType =
  | "policy"
  | "amendment"
  | "faq"
  | "memo";

export type AnswerStatus =
  | "consistent"
  | "conflict_resolved"
  | "conflict_unresolved"
  | "insufficient_evidence";

export type ResolutionType =
  | "superseded"
  | "unresolvable";

export type StalenessBasis =
  | "explicit_supersedes"
  | "newer_version_same_family";

export interface DocumentMeta {
  doc_id: string;
  title: string;
  doc_type: DocumentType;
  version: string;
  effective_date: string;
  family: string;
  supersedes: string[];
  chunk_count: number;
}

export interface Source {
  doc_id: string;
  title: string;
  doc_type: string;
  version: string;
  effective_date: string;
  chunk_id: string;
  quote: string;
}

export interface Claim {
  text: string;
  supported: boolean;
  citations: string[];
}

export interface ConflictPosition {
  claim: string;
  source: Source;
}

export interface ConflictResolution {
  type: ResolutionType;
  winning_doc_id: string | null;
  rationale: string;
}

export interface Conflict {
  conflict_id: string;
  topic: string;
  positions: ConflictPosition[];
  resolution: ConflictResolution;
}

export interface StalenessFinding {
  stale_doc_id: string;
  superseded_by_doc_id: string;
  basis: StalenessBasis;
}

export interface TraceRetrieverCandidate {
  chunk_id: string;
  score: number;
  doc_id: string;
}

export interface TraceRetriever {
  candidates: TraceRetrieverCandidate[];
}

export interface TraceSynthesizer {
  draft_answer: string;
  claims: Claim[];
}

export interface TraceCritic {
  contradictions: unknown[];
  stale: StalenessFinding[];
  unsupported_claims: string[];
}

export interface TraceResolution {
  decisions: unknown[];
}

export interface TraceTimings {
  retriever: number;
  synthesizer: number;
  critic: number;
  resolution: number;
  total: number;
}

export interface Trace {
  retriever: TraceRetriever;
  synthesizer: TraceSynthesizer;
  critic: TraceCritic;
  resolution: TraceResolution;
  timings_ms: TraceTimings;
}

export interface AskResponse {
  run_id: string;
  question: string;
  status: AnswerStatus;
  final_answer: string;
  conflicts: Conflict[];
  claims: Claim[];
  staleness_findings: StalenessFinding[];
  citations: Source[];
  trace: Trace;
}

export interface HealthResponse {
  status: string;
  documents: number;
  chunks: number;
}

export interface SeedResponse {
  documents: number;
  chunks: number;
}

export interface DeleteDocumentResponse {
  deleted: string;
}

export interface SeedQuestion {
  question: string;
  expected_status: AnswerStatus;
}

export interface ApiErrorBody {
  error: string;
}