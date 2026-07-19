import axiosClient from "@/api/axiosClient";

export async function getOverview() {
  const res = await axiosClient.get("/admin/analytics/overview");
  return res.data;
}
