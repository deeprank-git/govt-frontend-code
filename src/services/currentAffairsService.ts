import axiosClient from "@/api/axiosClient";

export async function getCurrentAffairs(params?: { date?: string; category?: string; q?: string; limit?: number; isPublished?: boolean }) {
  const res = await axiosClient.get("/current-affairs", { params });
  return res.data;
}

export async function getCurrentAffairById(id: string) {
  const res = await axiosClient.get(`/current-affairs/${id}`);
  return res.data;
}

// Fire-and-forget streak ping — call once per article-view mount, never
// blocks rendering the article. `clientDate` lets the backend reconcile
// "today" against the reader's local timezone rather than server time.
export async function recordCurrentAffairView(id: string, clientDate: string) {
  const res = await axiosClient.post(`/current-affairs/${id}/record-view`, { date: clientDate });
  return res.data;
}

export type CurrentAffairsStreak = {
  currentStreak: number;
  longestStreak: number;
  weekActivity: { date: string; label: string; completed: boolean }[];
};

export async function getCurrentAffairsStreak() {
  const res = await axiosClient.get("/current-affairs/streak");
  return res.data;
}

export type CurrentAffairInput = {
  title?: string;
  content?: string;
  summary?: string;
  date?: string;
  category?: string;
  tags?: string[];
  isPublished?: boolean;
  image?: File;
};

// Create/update are multipart/form-data (same reasoning as testSeriesService's
// buildTestSeriesForm) so the article image can be uploaded as a real file;
// tags rides along as a JSON-stringified text field since FormData can't
// carry arrays directly.
function buildCurrentAffairForm(data: CurrentAffairInput) {
  const form = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return;
    if (key === "tags") {
      form.append(key, JSON.stringify(value));
    } else if (value instanceof File) {
      form.append(key, value);
    } else {
      form.append(key, String(value));
    }
  });
  return form;
}

export async function createCurrentAffair(data: CurrentAffairInput) {
  const res = await axiosClient.post("/admin/current-affairs", buildCurrentAffairForm(data), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function updateCurrentAffair(id: string, data: CurrentAffairInput) {
  const res = await axiosClient.patch(`/admin/current-affairs/${id}`, buildCurrentAffairForm(data), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deleteCurrentAffair(id: string) {
  const res = await axiosClient.delete(`/admin/current-affairs/${id}`);
  return res.data;
}
