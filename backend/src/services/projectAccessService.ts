import { User } from "../models/User.js";

/** Returns the project ids currently assigned to a user (empty array if none, e.g. not a Site Manager). */
export async function getAssignedProjectIds(userId: string): Promise<string[]> {
  const user = await User.findById(userId).select("assignedProjectIds").lean();
  return (user?.assignedProjectIds ?? []).map((id) => id.toString());
}

/**
 * Resolves the project id a Site Manager is acting on for a given request.
 * - If a specific project was requested (e.g. via the project switcher), it's honored only when the
 *   Site Manager is assigned to it — otherwise undefined (not permitted).
 * - Otherwise, defaults to their sole assigned project. If they have zero or more than one assigned
 *   project, the caller must be explicit, so undefined is returned.
 */
export async function resolveSiteManagerProjectId(
  userId: string,
  requested?: string
): Promise<string | undefined> {
  const assigned = await getAssignedProjectIds(userId);
  if (requested) return assigned.includes(requested) ? requested : undefined;
  return assigned.length === 1 ? assigned[0] : undefined;
}

/** Whether a Site Manager is assigned to the given project. */
export async function isProjectAssignedToUser(userId: string, projectId: string | undefined): Promise<boolean> {
  if (!projectId) return false;
  const assigned = await getAssignedProjectIds(userId);
  return assigned.includes(projectId);
}
