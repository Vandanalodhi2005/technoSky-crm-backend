import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  logAdminError,
  requireAdmin,
  requireTrustedOrigin,
} from "@/lib/admin-api";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";

const updateSchema = z.object({ isActive: z.boolean() }).strict();

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
        { success: false, message: "Invalid user ID." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Choose a valid account status." },
        { status: 400 }
      );
    }

    await connectDB();
    const data = await User.findByIdAndUpdate(
      id,
      { $set: { isActive: parsed.data.isActive } },
      { new: true, runValidators: true }
    )
      .select("name email isActive emailVerifiedAt createdAt")
      .lean();

    if (!data) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return logAdminError("Update user account", error);
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
        { success: false, message: "Invalid user ID." },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(id).select("email").lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    await User.deleteOne({ _id: id });

    return NextResponse.json({
      success: true,
      message: "Account permanently deleted. Related leads were not changed.",
    });
  } catch (error) {
    return logAdminError("Delete user account", error);
  }
}
