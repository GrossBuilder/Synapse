import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATARS_DIR = path.join(process.cwd(), "data", "avatars");

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const formData = await req.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG, or WebP" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 400 });
    }

    // Delete old avatar if it exists
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { image: true } });
    if (user?.image) {
      const oldFilename = user.image.split("/").pop();
      if (oldFilename) {
        const oldPath = path.join(AVATARS_DIR, oldFilename);
        try { await unlink(oldPath); } catch { /* old file may not exist */ }
      }
    }

    const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
    const filename = `${userId}-${crypto.randomBytes(8).toString("hex")}${ext}`;

    await mkdir(AVATARS_DIR, { recursive: true });

    const filepath = path.join(AVATARS_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const imageUrl = `/api/profile/avatar/${filename}`;

    await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
    });

    return NextResponse.json({ image: imageUrl });
  } catch (err) {
    console.error("Avatar upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { image: true } });
  if (user?.image) {
    const oldFilename = user.image.split("/").pop();
    if (oldFilename) {
      const oldPath = path.join(AVATARS_DIR, oldFilename);
      try { await unlink(oldPath); } catch { /* ignore */ }
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { image: null },
  });

  return NextResponse.json({ success: true });
}
