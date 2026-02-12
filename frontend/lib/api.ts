const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
type TokenGetter = (() => Promise<string | null>) | undefined;

export type Study = {
  id: number;
  slug: string;
  name: string;
  description: string;
};

export type FilterOptions = {
  industry: string[];
  region: string[];
  gender: string[];
  vote: string[];
};

export type TimePoint = {
  wave: string;
  wave_date: string;
  value: number | null;
};

export type DistributionPoint = {
  group: string;
  value: number | null;
};

export type SavedView = {
  id: number;
  name: string;
  question_code: string;
  distribution_dimension: string;
  filters: Record<string, string>;
  created_at: string;
};

function buildAuthHeaders(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getStudies(): Promise<Study[]> {
  const res = await fetch(`${API_BASE}/api/studies`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load studies");
  }
  return res.json();
}

export async function getFilterOptions(studyId: number): Promise<FilterOptions> {
  const res = await fetch(`${API_BASE}/api/studies/${studyId}/filters`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load filter options");
  }
  return res.json();
}

function appendFilters(searchParams: URLSearchParams, filters: Record<string, string>) {
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });
}

export async function getTimeseries(
  studyId: number,
  questionCode: string,
  filters: Record<string, string>
): Promise<TimePoint[]> {
  const searchParams = new URLSearchParams({ question_code: questionCode });
  appendFilters(searchParams, filters);

  const res = await fetch(`${API_BASE}/api/studies/${studyId}/timeseries?${searchParams.toString()}`, {
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error("Failed to load timeseries");
  }
  return res.json();
}

export async function getDistribution(
  studyId: number,
  questionCode: string,
  dimension: string,
  filters: Record<string, string>
): Promise<DistributionPoint[]> {
  const searchParams = new URLSearchParams({ question_code: questionCode, dimension });
  appendFilters(searchParams, filters);

  const res = await fetch(`${API_BASE}/api/studies/${studyId}/distribution?${searchParams.toString()}`, {
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error("Failed to load distribution");
  }
  return res.json();
}

export async function exportCsv(
  studyId: number,
  questionCode: string,
  dimension: string,
  filters: Record<string, string>,
  getToken?: TokenGetter
): Promise<Blob> {
  const searchParams = new URLSearchParams({ question_code: questionCode, dimension });
  appendFilters(searchParams, filters);
  const token = getToken ? await getToken() : null;

  const res = await fetch(`${API_BASE}/api/studies/${studyId}/export.csv?${searchParams.toString()}`, {
    cache: "no-store",
    headers: buildAuthHeaders(token)
  });
  if (!res.ok) {
    throw new Error("Failed to export CSV");
  }
  return res.blob();
}

export async function getSavedViews(studyId: number, getToken?: TokenGetter): Promise<SavedView[]> {
  const token = getToken ? await getToken() : null;
  const res = await fetch(`${API_BASE}/api/saved-views?study_id=${studyId}`, {
    cache: "no-store",
    headers: buildAuthHeaders(token)
  });
  if (!res.ok) {
    throw new Error("Failed to load saved views");
  }
  return res.json();
}

export async function createSavedView(
  payload: {
    study_id: number;
    name: string;
    question_code: string;
    distribution_dimension: string;
    filters: Record<string, string>;
  },
  getToken?: TokenGetter
): Promise<void> {
  const token = getToken ? await getToken() : null;
  const res = await fetch(`${API_BASE}/api/saved-views`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(token)
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error("Failed to save view");
  }
}

export async function deleteSavedView(viewId: number, getToken?: TokenGetter): Promise<void> {
  const token = getToken ? await getToken() : null;
  const res = await fetch(`${API_BASE}/api/saved-views/${viewId}`, {
    method: "DELETE",
    headers: buildAuthHeaders(token)
  });
  if (!res.ok) {
    throw new Error("Failed to delete saved view");
  }
}
