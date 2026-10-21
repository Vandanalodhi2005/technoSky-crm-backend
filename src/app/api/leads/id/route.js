
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { getAuthenticatedUser, hasTrustedOrigin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/lead";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  company: z.string().trim().max(150).optional(),
  email: z.string().trim().max(254).optional(),
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
  source: z.enum([
    "Website",
    "Referral",
    "LinkedIn",
    "Other",
  ]).optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();

export async function PATCH(request, { params }) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(
      { success: false, message: "Request origin is not allowed." },
      { status: 403 }
    );
  }

  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid lead ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success || Object.keys(body).length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid update data" },
        { status: 400 }
      );
    }

    await connectDB();

    const lead = await Lead.findByIdAndUpdate(
      id,
      { $set: result.data },
      { new: true, runValidators: true }
    );

    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    console.error(
      "Update lead failed:",
      error instanceof Error ? error.name : "UnknownError"
    );

    return NextResponse.json(
      { success: false, message: "Unable to update lead" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(
      { success: false, message: "Request origin is not allowed." },
      { status: 403 }
    );
  }

  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid lead ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const lead = await Lead.findByIdAndDelete(id);

    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete lead failed:",
      error instanceof Error ? error.name : "UnknownError"
    );

    return NextResponse.json(
      { success: false, message: "Unable to delete lead" },
      { status: 500 }
    );
  }
}
