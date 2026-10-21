import { NextResponse } from "next/server";
import { logAdminError, requireAdmin } from "@/lib/admin-api";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/lead";

export async function GET() {
  try {
    const { response } = await requireAdmin();

    if (response) {
      return response;
    }

    await connectDB();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [byStatus, bySource, monthly] = await Promise.all([
      Lead.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        { $group: { _id: "$source", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m", date: "$createdAt" },
            },
            leads: { $sum: 1 },
            won: {
              $sum: { $cond: [{ $eq: ["$status", "Won"] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      data: { byStatus, bySource, monthly },
    });
  } catch (error) {
    return logAdminError("Load admin reports", error);
  }
}
