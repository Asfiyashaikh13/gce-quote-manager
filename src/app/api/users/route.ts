import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/types";
import { Role } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const { email, name, role, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const validRoles = ["ADMIN", "MANAGER", "STAFF", "VIEWER"];
    const targetRole = validRoles.includes(role) ? (role as Role) : Role.STAFF;

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: trimmedEmail,
        name: name || null,
        role: targetRole,
        passwordHash,
        mustChangePassword: true,
        createdById: session.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityName: "User",
        entityId: newUser.id,
        action: "CREATE",
        performedById: session.id,
        details: JSON.stringify({ email: newUser.email, role: newUser.role }),
      },
    });

    return NextResponse.json({ user: newUser });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const { id, role, name, resetPassword } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const dataToUpdate: Record<string, unknown> = {};

    if (role) {
      dataToUpdate.role = role as Role;
    }
    if (name !== undefined) {
      dataToUpdate.name = name;
    }
    if (resetPassword) {
      dataToUpdate.passwordHash = await bcrypt.hash(resetPassword, 10);
      dataToUpdate.mustChangePassword = true;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...dataToUpdate,
        updatedById: session.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mustChangePassword: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityName: "User",
        entityId: id,
        action: "UPDATE",
        performedById: session.id,
        details: JSON.stringify(dataToUpdate),
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || !canManageUsers(session.role)) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (id === session.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: session.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityName: "User",
        entityId: id,
        action: "DELETE",
        performedById: session.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

