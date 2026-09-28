import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";
const BACKEND_API_KEY = process.env.BACKEND_API_KEY ?? "";

export const dynamic = "force-dynamic";

const UPSTREAM_TIMEOUT_MS = 10_000;

function toIntCentsStrict(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const cents = Math.round(n);
  return Number.isSafeInteger(cents) ? cents : null;
}

function isValidTransaction(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  if (
    typeof t.id !== "string" ||
    typeof t.description !== "string" ||
    typeof t.createdAt !== "string"
  )
    return false;
  if (t.type !== 1 && t.type !== 2) return false;
  if (toIntCentsStrict(t.amount) === null) return false;
  return true;
}

/** Repassa só campos conhecidos do erro upstream (nada de corpo cru). */
function sanitizedUpstream(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null) {
    return { error: "upstream_error" };
  }
  const out: Record<string, unknown> = {};
  const b = body as Record<string, unknown>;
  if (typeof b.error === "string") out.error = b.error;
  else out.error = "upstream_error";
  if (typeof b.detail === "string") out.detail = b.detail;
  if (Array.isArray(b.errors)) {
    out.errors = b.errors.filter((e) => typeof e === "string").slice(0, 10);
  }
  return out;
}

/**
 * Retorna saldo + histórico em uma única requisição (RNF-05).
 * O frontend chama este endpoint same-origin; o proxy evita CORS e mantém a
 * API key só no servidor — o header X-Api-Key é injetado aqui, nunca no browser.
 * Repassa ?page/?pageSize (validados: page >= 1, 1 <= pageSize <= 200).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "50");

  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200) {
    return NextResponse.json(
      {
        error: "Validation failed",
        detail: "Query parameters must satisfy: page >= 1, 1 <= pageSize <= 200.",
        errors: ["Query parameters must satisfy: page >= 1, 1 <= pageSize <= 200."],
      },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/transactions?page=${page}&pageSize=${pageSize}`,
      {
        cache: "no-store",
        headers: { "X-Api-Key": BACKEND_API_KEY },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      },
    );
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(sanitizedUpstream(body), { status: res.status });
    }

    const b = body as Record<string, unknown>;
    const balance = toIntCentsStrict(b.currentBalance);
    const pageNum = toIntCentsStrict(b.page);
    const sizeNum = toIntCentsStrict(b.pageSize);
    const totalNum = toIntCentsStrict(b.totalCount);
    if (
      typeof b.accountId !== "string" ||
      b.accountId.length === 0 ||
      balance === null ||
      pageNum === null ||
      sizeNum === null ||
      totalNum === null
    ) {
      console.error("proxy /api/account: corpo inválido do backend");
      return NextResponse.json({ error: "upstream_unavailable" }, { status: 502 });
    }

    return NextResponse.json({
      accountId: b.accountId,
      balance,
      transactions: Array.isArray(b.transactions)
        ? b.transactions.filter(isValidTransaction)
        : [],
      page: pageNum,
      pageSize: sizeNum,
      totalCount: totalNum,
    });
  } catch (err) {
    console.error("proxy /api/account: falha de rede", err);
    return NextResponse.json(
      { error: "upstream_unavailable" },
      { status: 502 },
    );
  }
}

/**
 * Cria a conta única (first-run). Repassa para POST /api/accounts do backend
 * (melhor prática REST: plural na coleção); 409 (já existe — corrida de
 * duplo clique/retry) é repassado como está e o `lib/api.ts` o trata como
 * sucesso, seguindo para `GET` normalmente.
 */
export async function POST() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/accounts`, {
      method: "POST",
      cache: "no-store",
      headers: { "X-Api-Key": BACKEND_API_KEY },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(sanitizedUpstream(body), { status: res.status });
    }

    const b = (body ?? {}) as Record<string, unknown>;
    if (typeof b.accountId !== "string") {
      console.error("proxy POST /api/account: corpo inválido do backend");
      return NextResponse.json({ error: "upstream_unavailable" }, { status: 502 });
    }
    return NextResponse.json({ accountId: b.accountId }, { status: res.status });
  } catch (err) {
    console.error("proxy POST /api/account: falha de rede", err);
    return NextResponse.json(
      { error: "upstream_unavailable" },
      { status: 502 },
    );
  }
}
