import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";
const BACKEND_API_KEY = process.env.BACKEND_API_KEY ?? "";

export const dynamic = "force-dynamic";

const DESCRIPTION_MAX = 500;

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

function invalid(message: string) {
  return NextResponse.json(
    { error: "Validation failed", detail: message, errors: [message] },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return invalid("Corpo JSON inválido.");
  }

  // Fail-fast: o contrato é centavos (int > 0) + descrição 1..500; o backend valida de novo.
  const body = (payload ?? {}) as { amount?: unknown; description?: unknown };
  if (typeof body.amount !== "number" || !Number.isInteger(body.amount) || body.amount <= 0) {
    return invalid("amount deve ser inteiro maior que zero (centavos).");
  }
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (description.length === 0 || description.length > DESCRIPTION_MAX) {
    return invalid(`description deve ter 1-${DESCRIPTION_MAX} caracteres.`);
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/withdraw`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": BACKEND_API_KEY,
      },
      body: JSON.stringify({ amount: body.amount, description }),
    });
    const resBody = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(sanitizedUpstream(resBody), {
        status: res.status,
      });
    }

    return NextResponse.json(resBody, { status: 201 });
  } catch (err) {
    console.error("proxy /api/withdraw: falha de rede", err);
    return NextResponse.json(
      { error: "upstream_unavailable" },
      { status: 502 },
    );
  }
}
