import Dashboard from "@/components/Dashboard";
import {
  NETWORK_ERROR_MESSAGE,
  toIntCentsStrict,
  type AccountSnapshot,
} from "@/lib/api";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";
const BACKEND_API_KEY = process.env.BACKEND_API_KEY ?? "";

export const dynamic = "force-dynamic";

interface RawHistory {
  accountId: unknown;
  /** currentBalance em centavos (int). */
  currentBalance: unknown;
  transactions?: unknown;
  page?: unknown;
  pageSize?: unknown;
  totalCount?: unknown;
}

function isValidTransaction(value: unknown): value is AccountSnapshot["transactions"][number] {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    (typeof t.amount === "number" || typeof t.amount === "string") &&
    typeof t.type === "number" &&
    typeof t.description === "string" &&
    typeof t.createdAt === "string"
  );
}

/**
 * Carga inicial no servidor: saldo + histórico em uma única requisição,
 * direto da fonte (API C#), sem round-trip extra pelo browser (RNF-05).
 * Banco vazio (404) não é erro — é first-run e vira a tela "Começar".
 */
async function getInitialData(): Promise<{
  snapshot: AccountSnapshot | null;
  error: string | null;
  noAccount: boolean;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/transactions`, {
      cache: "no-store",
      headers: { "X-Api-Key": BACKEND_API_KEY },
    });
    if (res.status === 404) {
      return { snapshot: null, error: null, noAccount: true };
    }
    if (res.status === 401) {
      console.error("getInitialData: backend respondeu 401 — BACKEND_API_KEY ausente ou inválida");
      return {
        snapshot: null,
        error:
          "Falha de configuração do servidor (autenticação). Verifique a API key e tente novamente.",
        noAccount: false,
      };
    }
    if (!res.ok) {
      console.error(`getInitialData: backend respondeu ${res.status}`);
      return { snapshot: null, error: NETWORK_ERROR_MESSAGE, noAccount: false };
    }
    const raw = (await res.json()) as RawHistory;
    if (typeof raw.accountId !== "string" || raw.accountId.length === 0) {
      console.error("getInitialData: accountId inválido no corpo do backend");
      return { snapshot: null, error: NETWORK_ERROR_MESSAGE, noAccount: false };
    }
    const balance = toIntCentsStrict(raw.currentBalance as number | string);
    if (balance === null) {
      console.error("getInitialData: currentBalance inválido no corpo do backend");
      return { snapshot: null, error: NETWORK_ERROR_MESSAGE, noAccount: false };
    }
    const toPage = (v: unknown, fallback: number) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 0 ? n : fallback;
    };
    return {
      snapshot: {
        accountId: raw.accountId,
        balance,
        transactions: Array.isArray(raw.transactions)
          ? raw.transactions.filter(isValidTransaction)
          : [],
        page: toPage(raw.page, 1),
        pageSize: toPage(raw.pageSize, 50),
        totalCount: toPage(raw.totalCount, 0),
      },
      error: null,
      noAccount: false,
    };
  } catch (err) {
    console.error("getInitialData: falha de rede ou parse", err);
    return { snapshot: null, error: NETWORK_ERROR_MESSAGE, noAccount: false };
  }
}

export default async function Home() {
  const { snapshot, error, noAccount } = await getInitialData();

  return (
    <Dashboard
      initialSnapshot={snapshot}
      initialError={error}
      initialNoAccount={noAccount}
    />
  );
}
