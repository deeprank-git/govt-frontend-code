import axiosClient from "@/api/axiosClient";

export async function getLeaderboard(testId: string, limit?: number) {
  const res = await axiosClient.get(`/leaderboard/${testId}`, { params: limit ? { limit } : undefined });
  return res.data;
}
