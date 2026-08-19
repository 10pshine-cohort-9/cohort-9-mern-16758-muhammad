import { Router, type Request } from "express";
import type { Logger } from "pino";

import type { AuthenticationService } from "../auth/auth-service.js";
import { HttpError } from "../middleware/error-handler.js";
import type { NoteService } from "../notes/note-service.js";
import { getSessionToken } from "./auth-routes.js";

async function getUserId(
  request: Request,
  authenticationService: AuthenticationService,
): Promise<string> {
  const sessionToken = getSessionToken(request);
  const user = sessionToken
    ? await authenticationService.authenticateSession(sessionToken)
    : null;

  if (!user) {
    throw new HttpError(401, "AUTHENTICATION_REQUIRED", "Please log in.");
  }

  return user.id;
}

function logNoteAction(
  request: Request,
  action: string,
  userId: string,
  noteId: string,
): void {
  const logger = (request as unknown as { readonly log?: Logger }).log;
  logger?.info({ action, userId, noteId }, "Note activity");
}

export function createNoteRouter(
  authenticationService: AuthenticationService,
  noteService: NoteService,
): Router {
  const router = Router();

  router.use((_request, response, next) => {
    response.setHeader("cache-control", "no-store");
    next();
  });

  router.post("/", async (request, response, next) => {
    try {
      const userId = await getUserId(request, authenticationService);
      const note = await noteService.createNote(userId, request.body);

      logNoteAction(request, "created", userId, note.id);
      response.status(201).json({ note });
    } catch (error: unknown) {
      next(error);
    }
  });

  router.get("/", async (request, response, next) => {
    try {
      const userId = await getUserId(request, authenticationService);
      const notes = await noteService.getNotes(
        userId,
        request.query.search,
        request.query.searchIn,
        request.query.sort,
      );

      response.status(200).json({ notes });
    } catch (error: unknown) {
      next(error);
    }
  });

  router.get("/:id", async (request, response, next) => {
    try {
      const userId = await getUserId(request, authenticationService);
      const note = await noteService.getNote(userId, request.params.id);

      response.status(200).json({ note });
    } catch (error: unknown) {
      next(error);
    }
  });

  router.put("/:id", async (request, response, next) => {
    try {
      const userId = await getUserId(request, authenticationService);
      const note = await noteService.updateNote(
        userId,
        request.params.id,
        request.body,
      );

      logNoteAction(request, "updated", userId, note.id);
      response.status(200).json({ note });
    } catch (error: unknown) {
      next(error);
    }
  });

  router.delete("/:id", async (request, response, next) => {
    try {
      const userId = await getUserId(request, authenticationService);
      const noteId = request.params.id;

      await noteService.deleteNote(userId, noteId);
      logNoteAction(request, "deleted", userId, noteId);
      response.status(204).end();
    } catch (error: unknown) {
      next(error);
    }
  });

  return router;
}
