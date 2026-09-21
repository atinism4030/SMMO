import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createBoardFromImport, BoardImportError } from '@/lib/boardImportService';

// The client only ever gets here after the /validate step succeeded and the
// CEO reviewed the preview — but re-validate the shape server-side anyway
// (never trust that the client didn't tamper with the edited item list).
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { clientId, boardName, month, year, items, confirmDuplicate } = body;

  if (!clientId || !boardName || !month || !year || !Array.isArray(items)) {
    return NextResponse.json({ error: 'clientId, boardName, month, year, and items are required' }, { status: 400 });
  }
  for (const item of items) {
    if (!item?.title || !item?.contentType || !item?.scheduledDate) {
      return NextResponse.json({ error: 'Every item needs a title, contentType, and scheduledDate' }, { status: 400 });
    }
  }

  try {
    const result = await createBoardFromImport({
      clientId, boardName, month: Number(month), year: Number(year), items, createdBy: session.userId, confirmDuplicate,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const status = err instanceof BoardImportError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Failed to import board';
    return NextResponse.json({ error: message }, { status });
  }
}
