import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      interests: { include: { subcategory: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    region: user.region,
    bio: user.bio || "",
    experienceLevel: user.experienceLevel,
    interests: user.interests.map(i => i.subcategory.slug),
    tags: user.tags.map(t => t.tag.name),
    preferredRegion: user.preferredRegion,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json();

  const validLevels = ["BEGINNER", "INTERMEDIATE", "EXPERT"];
  if (body.experienceLevel && !validLevels.includes(body.experienceLevel)) {
    return NextResponse.json({ error: "Invalid experience level" }, { status: 400 });
  }

  if (body.bio !== undefined && typeof body.bio === "string" && body.bio.length > 200) {
    return NextResponse.json({ error: "Bio too long (max 200)" }, { status: 400 });
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.length > 10) {
      return NextResponse.json({ error: "Max 10 tags" }, { status: 400 });
    }
    if (body.tags.some((t: unknown) => typeof t !== "string" || (t as string).length > 30)) {
      return NextResponse.json({ error: "Tag too long (max 30)" }, { status: 400 });
    }
  }

  if (body.interests !== undefined) {
    if (!Array.isArray(body.interests) || body.interests.length > 20) {
      return NextResponse.json({ error: "Max 20 interests" }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = {};
  if (body.bio !== undefined) data.bio = String(body.bio).slice(0, 200);
  if (body.experienceLevel) data.experienceLevel = body.experienceLevel;
  if (body.preferredRegion) data.preferredRegion = body.preferredRegion;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  // Update tags if provided
  if (Array.isArray(body.tags)) {
    await prisma.userTag.deleteMany({ where: { userId } });
    for (const tagName of body.tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        create: { name: tagName },
        update: {},
      });
      await prisma.userTag.create({ data: { userId, tagId: tag.id } });
    }
  }

  // Update interests if provided
  if (Array.isArray(body.interests)) {
    await prisma.userInterest.deleteMany({ where: { userId } });
    for (const slug of body.interests) {
      const sub = await prisma.subcategory.findFirst({ where: { slug } });
      if (sub) {
        await prisma.userInterest.create({ data: { userId, subcategoryId: sub.id } });
      }
    }
  }

  return NextResponse.json({
    success: true,
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      bio: user.bio,
      experienceLevel: user.experienceLevel,
      preferredRegion: user.preferredRegion,
    },
  });
}
