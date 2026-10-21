import { NextResponse } from "next/server";
import { z } from "zod";
import {
  logAdminError,
  requireAdmin,
  requireTrustedOrigin,
} from "@/lib/admin-api";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/lead";

const leadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  company: z.string().trim().max(150).optional().default(""),
  email: z.string().trim().email().max(254).optional().or(z.literal("")).default(""),
  phone: z.string().trim().max(25).optional().default(""),
  service: z.enum([
    "Web Development",
    "Software Development",
    "Mobile App Development",
    "Cloud & IT Support",
    "Other",
  ]),
  status: z.enum([
    "New",
    "Contacted",
    "Qualified",
    "Proposal Sent",
    "Won",
    "Lost",
  ]).optional().default("New"),
  source: z.enum(["Website", "Referral", "LinkedIn", "Other"])
    .optional()
    .default("Website"),
  notes: z.string().trim().max(2000).optional().default(""),
});

export async function GET(request) {
  try {
    const { response } = await requireAdmin();

    if (response) {
      return response;
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const status = searchParams.get("status");
    const filter = {};

    if (query) {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escapedQuery, $options: "i" } },
        { company: { $regex: escapedQuery, $options: "i" } },
        { email: { $regex: escapedQuery, $options: "i" } },
      ];
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    const [data, total] = await Promise.all([
      Lead.find(filter).sort({ createdAt: -1 }).limit(500).lean(),
      Lead.countDocuments(filter),
    ]);

    return NextResponse.json({ success: true, data, total });
  } catch (error) {
    return logAdminError("Load admin leads", error);
  }
}

export async function POST(request) {
  const originError = requireTrustedOrigin(request);

  if (originError) {
    return originError;
  }

  try {
    const { response } = await requireAdmin();

    if (response) {
      return response;
    }

    const body = await request.json().catch(() => null);
    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Check the lead details and try again." },
        { status: 400 }
      );
    }

    await connectDB();
    const data = await Lead.create(parsed.data);

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return logAdminError("Create admin lead", error);
  }
}
