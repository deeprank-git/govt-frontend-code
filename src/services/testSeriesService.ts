import axiosClient from "@/api/axiosClient";

export async function getTestSeries(params?: { category?: string; isActive?: boolean; isPublished?: boolean }) {
  const res = await axiosClient.get("/test-series", { params });
  return res.data;
}

export async function getTestSeriesById(id: string) {
  const res = await axiosClient.get(`/test-series/${id}`);
  return res.data;
}

export type TestSeriesInput = {
  name?: string;
  category?: string;
  description?: string;
  isActive?: boolean;
  isPublished?: boolean;
  isPaid?: boolean;
  price?: number;
  negativeMarking?: boolean;
  negativeMarksPerQuestion?: number;
  marksPerQuestion?: number;
  importantDates?: Record<string, { from: string; to: string }>;
  image?: File;
  notificationPdf?: File;
};

// Create/update are multipart/form-data (see GovtPrep-Backend-Workflow-and-Status.md
// §5) so the series image can be uploaded as a real file, and importantDates rides
// along as a JSON-stringified text field rather than raw JSON.
function buildTestSeriesForm(data: TestSeriesInput) {
  const form = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return;
    if (key === "importantDates") {
      form.append(key, JSON.stringify(value));
    } else if (value instanceof File) {
      form.append(key, value);
    } else {
      form.append(key, String(value));
    }
  });
  return form;
}

export async function createTestSeries(data: TestSeriesInput) {
  const res = await axiosClient.post("/admin/test-series", buildTestSeriesForm(data), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function updateTestSeries(id: string, data: TestSeriesInput) {
  const res = await axiosClient.patch(`/admin/test-series/${id}`, buildTestSeriesForm(data), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deleteTestSeries(id: string) {
  const res = await axiosClient.delete(`/admin/test-series/${id}`);
  return res.data;
}
