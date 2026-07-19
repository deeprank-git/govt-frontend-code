import axiosClient from "@/api/axiosClient";

export async function getSettings() {
  const res = await axiosClient.get("/settings");
  return res.data;
}

export async function updateSettings(data: Partial<{
  siteName: string;
  logo: string;
  contactEmail: string;
  socialLinks: Record<string, string>;
  maintenanceMode: boolean;
}>) {
  const res = await axiosClient.put("/admin/settings", data);
  return res.data;
}
