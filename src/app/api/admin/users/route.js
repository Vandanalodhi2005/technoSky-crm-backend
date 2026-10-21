import { NextResponse } from "next/server";
import {
  logAdminError,
  requireAdmin,
} from "@/lib/admin-api";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";

export async function GET(request) {
  try {
    const { response } = await requireAdmin();

    if (response) {
      return response;
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const filter = {};

    if (query) {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escapedQuery, $options: "i" } },
        { email: { $regex: escapedQuery, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .limit(500)
        .select("name email isActive emailVerifiedAt createdAt")
        .lean(),
      User.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: data.map((user) => ({
        ...user,
        isActive: user.isActive !== false,
      })),
      total,
    });
  } catch (error) {
    return logAdminError("Load admin users", error);
  }
}
