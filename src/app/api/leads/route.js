
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, hasTrustedOrigin } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/lead";

const leadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  company: z.string().trim().max(150).optional().default(""),
  email: z.string().trim().max(254).optional().default(""),
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
  source: z.enum([
    "Website",
    "Referral",
    "LinkedIn",
    "Other",
  ]).optional().default("Website"),
  notes: z.string().trim().max(2000).optional().default(""),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    await connectDB();

    const leads = await Lead.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      data: leads,
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    console.error(
      "Get leads failed:",
      error instanceof Error ? error.name : "UnknownError"
    );

    return NextResponse.json(
      { success: false, message: "Unable to load leads" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
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

    const body = await request.json();
    const result = leadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please check the lead details",
          errors: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    await connectDB();

    const lead = await Lead.create(result.data);

    return NextResponse.json(
      { success: true, data: lead },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Create lead failed:",
      error instanceof Error ? error.name : "UnknownError"
    );

    return NextResponse.json(
      { success: false, message: "Unable to create lead" },
      { status: 500 }
    );
  }
}
