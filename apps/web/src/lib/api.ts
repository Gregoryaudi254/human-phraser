export type CurrentUser = {
  id: number;
  clerk_user_id: string;
  email: string;
  plan: string;
  balance_words: number;
  plan_renews_at: string | null;
  created_at: string;
};

export type BillingAccount = {
  plan: string;
  balance_words: number;
  renewal_date: string | null;
  free_monthly_words: number;
  pro_monthly_words: number;
};

export type RewriteRecord = {
  id: number;
  original_text: string;
  rewritten_text: string;
  mode: string;
  naturalness_score: number | null;
  words_used: number;
  created_at: string;
};

export type RewriteHistoryPage = {
  items: RewriteRecord[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type DashboardStats = {
  total_rewrites_month: number;
  average_naturalness_score: number | null;
  words_used_month: number;
  plan_limit_words: number | null;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function readApiError(response: Response, fallback: string) {
  const message = await response.text();
  if (!message) {
    return fallback;
  }

  try {
    const payload = JSON.parse(message) as { detail?: unknown };
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
  } catch {
    // Keep the raw response body below.
  }

  return message;
}

export async function fetchCurrentUser(token: string): Promise<CurrentUser> {
  const response = await fetch(`${apiUrl}/api/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Unable to load user profile"));
  }

  return response.json();
}

export async function fetchBillingAccount(token: string): Promise<BillingAccount> {
  const response = await fetch(`${apiUrl}/billing/account`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Unable to load billing account"));
  }

  return response.json();
}

export async function createCheckout(token: string, kind: "pro" | "unlimited" | "credits"): Promise<string> {
  const response = await fetch(`${apiUrl}/billing/create-checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ kind })
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Unable to create checkout session"));
  }

  const payload = (await response.json()) as { url: string };
  return payload.url;
}

export async function createCustomerPortal(token: string): Promise<string> {
  const response = await fetch(`${apiUrl}/billing/create-portal`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Unable to create customer portal session"));
  }

  const payload = (await response.json()) as { url: string };
  return payload.url;
}

export async function fetchRewriteHistory(token: string, page = 1): Promise<RewriteHistoryPage> {
  const response = await fetch(`${apiUrl}/rewrites?page=${page}&page_size=10`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Unable to load rewrite history"));
  }

  return response.json();
}

export async function deleteRewrite(token: string, id: number): Promise<void> {
  const response = await fetch(`${apiUrl}/rewrites/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Unable to delete rewrite"));
  }
}

export async function fetchDashboardStats(token: string): Promise<DashboardStats> {
  const response = await fetch(`${apiUrl}/dashboard/stats`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Unable to load dashboard stats"));
  }

  return response.json();
}
