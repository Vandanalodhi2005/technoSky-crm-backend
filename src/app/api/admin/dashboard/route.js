import { NextResponse } from "next/server";
import { logAdminError, requireAdmin } from "@/lib/admin-api";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/lead";
import User from "@/models/user";

export async function GET() {
  try {
    const { response } = await requireAdmin();

    if (response) {
      return response;
    }

    await connectDB();

    const [totalLeads, totalUsers, statusCounts, sourceCounts, recentLeads] =
      await Promise.all([
        Lead.countDocuments(),
        User.countDocuments(),
        Lead.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Lead.aggregate([
          { $group: { _id: "$source", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Lead.find()
          .sort({ createdAt: -1 })
          .limit(6)
          .select("name company email status source createdAt")
          .lean(),
      ]);

    return NextResponse.json({
      success: true,
      data: { totalLeads, totalUsers, statusCounts, sourceCounts, recentLeads },
    });
  } catch (error) {
    return logAdminError("Load dashboard", error);
  }
}
