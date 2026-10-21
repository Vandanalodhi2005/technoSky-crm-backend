
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectDB();

    return NextResponse.json({
      success: true,
      message: "Technosky CRM API is running",
      database: "connected",
    });
  } catch (error) {
    console.error(
      "Health check failed:",
      error instanceof Error ? error.name : "UnknownError"
    );

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
      },
      { status: 503 }
    );
  }
}
