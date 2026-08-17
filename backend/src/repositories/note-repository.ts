import type { Note, Prisma, PrismaClient } from "../generated/prisma/client.js";

export class NoteRepository {
  private readonly database: PrismaClient;

  public constructor(database: PrismaClient) {
    this.database = database;
  }

  public async createNote(
    userId: string,
    title: string,
    content: Prisma.InputJsonValue,
    plainText: string,
  ): Promise<Note> {
    return this.database.note.create({
      data: {
        userId,
        title,
        content,
        plainText,
      },
    });
  }

  public async getNotes(userId: string, search?: string): Promise<Note[]> {
    if (search) {
      return this.database.note.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { plainText: { contains: search, mode: "insensitive" } },
          ],
        },
        orderBy: { updatedAt: "desc" },
      });
    }

    return this.database.note.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  public async getNoteById(
    userId: string,
    noteId: string,
  ): Promise<Note | null> {
    return this.database.note.findFirst({
      where: {
        id: noteId,
        userId,
      },
    });
  }

  public async updateNote(
    userId: string,
    noteId: string,
    title: string,
    content: Prisma.InputJsonValue,
    plainText: string,
  ): Promise<Note | null> {
    const result = await this.database.note.updateMany({
      where: {
        id: noteId,
        userId,
      },
      data: {
        title,
        content,
        plainText,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.getNoteById(userId, noteId);
  }

  public async deleteNote(userId: string, noteId: string): Promise<boolean> {
    const result = await this.database.note.deleteMany({
      where: {
        id: noteId,
        userId,
      },
    });

    return result.count > 0;
  }
}
