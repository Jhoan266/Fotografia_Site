import type { NextRequest } from "next/server";
import { changePhotoTrashState } from "@/modules/photos/trash";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return changePhotoTrashState(request, id, true);
}
