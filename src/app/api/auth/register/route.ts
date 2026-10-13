import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { user } from "@/server/db/schema";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 20);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };
    const { email, password, name } = body ?? {};

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 },
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await db.query.user.findFirst({
      where: eq(user.email, normalizedEmail),
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `usr_${nanoid()}`;
    const displayName = (name && typeof name === "string" ? name.trim() : "") || normalizedEmail.split("@")[0];

    await db.insert(user).values({
      id: userId,
      email: normalizedEmail,
      name: displayName,
      password: hashedPassword,
    });

    return NextResponse.json(
      {
        message: "Account created successfully.",
        user: {
          id: userId,
          email: normalizedEmail,
          name: displayName,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred while creating your account." },
      { status: 500 },
    );
  }
}
