import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  logAdminError,
  requireAdmin,
  requireTrustedOrigin,
} from "@/lib/admin-api";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/lead";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  company: z.string().trim().max(150).optional(),
  email: z.string().trim().email().max(254).or(z.literal("")).optional(),
  phone: z.string().trim().max(25).optional(),
  service: z.enum([
    "Web Development",
    "Software Development",
    "Mobile App Development",
    "Cloud & IT Support",
    "Other",
  ]).optional(),
  status: z.enum([
    "New",
    "Contacted",
    "Qualified",
    "Proposal Sent",
    "Won",
    "Lost",
  ]).optional(),
  source: z.enum(["Website", "Referral", "LinkedIn", "Other"]).optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();

export async function PATCH(request, { params }) {
  const originError = requireTrustedOrigin(request);

  if (originError) {
    return originError;
  }

  try {
    const { response } = await requireAdmin();

    if (response) {
      return response;
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid lead ID." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success || Object.keys(parsed.data || {}).length === 0) {
      return NextResponse.json(
        { success: false, message: "Enter valid lead updates." },
        { status: 400 }
      );
    }

    await connectDB();
    const data = await Lead.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true, runValidators: true }
    ).lean();

    if (!data) {
      return NextResponse.json(
        { success: false, message: "Lead not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return logAdminError("Update admin lead", error);
  }
}

export async function DELETE(request, { params }) {
  const originError = requireTrustedOrigin(request);

  if (originError) {
    return originError;
  }

  try {
    const { response } = await requireAdmin();

    if (response) {
      return response;
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid lead ID." },
        { status: 400 }
      );
    }

    await connectDB();
    const data = await Lead.findByIdAndDelete(id).lean();

    if (!data) {
      return NextResponse.json(
        { success: false, message: "Lead not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Lead deleted." });
  } catch (error) {
    return logAdminError("Delete admin lead", error);
  }
}
