/**
 * Pure JSON board-import validation — no external imports, fully
 * unit-testable. DB writes (creating the Board + Task documents) live in
 * '@/lib/boardImportService'.
 *
 * Schema v1.0 (conceptual — see BOARD_IMPORT_TEMPLATE for a concrete example):
 *   { version: "1.0", client: string, month: "YYYY-MM", boardName?: string,
 *     content: [{ type, title, description?, scheduledDate, platforms?, notes? }] }
 */

export const BOARD_IMPORT_VERSION = '1.0';

export const CONTENT_TYPES = ['POST', 'REEL', 'STORY', 'CAROUSEL', 'VIDEO', 'PHOTO', 'OTHER'] as const;
export type BoardImportContentType = (typeof CONTENT_TYPES)[number];

export const KNOWN_PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Website'];

export interface RawBoardImportContentItem {
  type?: unknown;
  title?: unknown;
  description?: unknown;
  scheduledDate?: unknown;
  platforms?: unknown;
  status?: unknown;
  notes?: unknown;
}

export interface RawBoardImport {
  version?: unknown;
  client?: unknown;
  month?: unknown;
  boardName?: unknown;
  content?: unknown;
}

export interface NormalizedContentItem {
  contentType: BoardImportContentType;
  title: string;
  description?: string;
  scheduledDate: string; // ISO
  platforms: string[];
  notes?: string;
  /** Position in the original JSON array — stable identity for the preview/edit step. */
  sourceIndex: number;
}

export interface BoardImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  boardName: string;
  month: number;
  year: number;
  items: NormalizedContentItem[];
}

function monthName(month: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2000, month - 1, 1));
}

/**
 * Validates and normalizes an uploaded/pasted board JSON payload against the
 * client selected in the UI (Step 1 of the import wizard) — `expectedClientName`
 * is informational (mismatches warn, they don't block: the dropdown selection
 * is the authority, not free text in the file).
 */
export function validateBoardImport(raw: unknown, expectedClientName?: string): BoardImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const empty = { valid: false, errors, warnings, boardName: '', month: 0, year: 0, items: [] };

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    errors.push('The uploaded content is not a valid JSON object.');
    return empty;
  }
  const data = raw as RawBoardImport;

  if (data.version === undefined) {
    warnings.push('No "version" field found — assuming 1.0.');
  } else if (data.version !== BOARD_IMPORT_VERSION) {
    errors.push(`Unsupported schema version "${String(data.version)}" — expected "${BOARD_IMPORT_VERSION}".`);
  }

  let month = 0;
  let year = 0;
  if (typeof data.month !== 'string' || !/^\d{4}-\d{2}$/.test(data.month)) {
    errors.push('"month" is required and must be in YYYY-MM format (e.g. "2026-09").');
  } else {
    const [y, m] = data.month.split('-').map(Number);
    if (m < 1 || m > 12) errors.push(`"month" has an invalid month number (${m}).`);
    else { year = y; month = m; }
  }

  const clientName = typeof data.client === 'string' ? data.client : undefined;
  if (expectedClientName && clientName && clientName.trim().toLowerCase() !== expectedClientName.trim().toLowerCase()) {
    warnings.push(`The file says client "${clientName}", but you selected "${expectedClientName}" — the selected client will be used.`);
  }

  const boardNameRaw = typeof data.boardName === 'string' ? data.boardName.trim() : '';
  const boardName = boardNameRaw || (month && year ? `${expectedClientName ?? clientName ?? 'Client'} — ${monthName(month)} ${year}` : '');

  if (!Array.isArray(data.content)) {
    errors.push('"content" must be an array of content items.');
    return { valid: false, errors, warnings, boardName, month, year, items: [] };
  }
  if (data.content.length === 0) {
    warnings.push('The content list is empty — the board will be created with no items.');
  }

  const items: NormalizedContentItem[] = [];
  const seen = new Set<string>();

  data.content.forEach((rawItem: unknown, i: number) => {
    const label = `Content item #${i + 1}`;
    if (typeof rawItem !== 'object' || rawItem === null) {
      errors.push(`${label} is not a valid object.`);
      return;
    }
    const item = rawItem as RawBoardImportContentItem;

    const title = typeof item.title === 'string' ? item.title.trim() : '';
    if (!title) {
      errors.push(`${label} is missing a title.`);
      return;
    }

    const typeRaw = typeof item.type === 'string' ? item.type.trim().toUpperCase() : '';
    const contentType = (CONTENT_TYPES as readonly string[]).includes(typeRaw) ? (typeRaw as BoardImportContentType) : null;
    if (!contentType) {
      errors.push(`${label} ("${title}") has an invalid or missing type — expected one of ${CONTENT_TYPES.join(', ')}.`);
      return;
    }

    if (typeof item.scheduledDate !== 'string' || isNaN(new Date(item.scheduledDate).getTime())) {
      errors.push(`${label} ("${title}") is missing a valid scheduledDate.`);
      return;
    }
    const date = new Date(item.scheduledDate);
    if (month && year && (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month)) {
      warnings.push(`${label} ("${title}") is scheduled on ${item.scheduledDate}, outside the board's month (${String(data.month)}).`);
    }

    const platforms = Array.isArray(item.platforms) ? item.platforms.filter((p): p is string => typeof p === 'string') : [];
    for (const p of platforms) {
      if (!KNOWN_PLATFORMS.includes(p)) warnings.push(`${label} ("${title}") uses an unrecognized platform "${p}".`);
    }

    const dupKey = `${contentType}|${title.toLowerCase()}|${item.scheduledDate}`;
    if (seen.has(dupKey)) warnings.push(`${label} ("${title}") looks like a duplicate of an earlier item (same type, title, and date).`);
    seen.add(dupKey);

    items.push({
      contentType,
      title,
      description: typeof item.description === 'string' ? item.description : undefined,
      scheduledDate: date.toISOString(),
      platforms,
      notes: typeof item.notes === 'string' ? item.notes : undefined,
      sourceIndex: i,
    });
  });

  return { valid: errors.length === 0, errors, warnings, boardName, month, year, items };
}

export function summarizeByType(items: NormalizedContentItem[]): Partial<Record<BoardImportContentType, number>> {
  const counts: Partial<Record<BoardImportContentType, number>> = {};
  for (const item of items) counts[item.contentType] = (counts[item.contentType] ?? 0) + 1;
  return counts;
}

export const BOARD_IMPORT_TEMPLATE = {
  version: '1.0',
  client: "Armando's Pizza",
  month: '2026-09',
  boardName: 'September 2026',
  content: [
    {
      type: 'POST',
      title: 'Margherita Pizza',
      description: 'Classic margherita — highlight fresh basil and mozzarella.',
      scheduledDate: '2026-09-03',
      platforms: ['Instagram', 'Facebook'],
      notes: '',
    },
    {
      type: 'STORY',
      title: 'Behind the Scenes',
      scheduledDate: '2026-09-05',
      platforms: ['Instagram'],
    },
    {
      type: 'REEL',
      title: 'Pizza Preparation',
      scheduledDate: '2026-09-08',
      platforms: ['Instagram', 'TikTok'],
    },
  ],
};

export const BOARD_IMPORT_AI_PROMPT = `You are helping plan a monthly social media content calendar for a client of a social media agency (SMMO). Generate ONLY valid JSON (no markdown, no commentary) matching this exact schema:

{
  "version": "1.0",
  "client": "<client name>",
  "month": "<YYYY-MM>",
  "boardName": "<short board name, e.g. 'September 2026'>",
  "content": [
    {
      "type": "POST | REEL | STORY | CAROUSEL | VIDEO | PHOTO | OTHER",
      "title": "<short descriptive title>",
      "description": "<optional 1-2 sentence brief>",
      "scheduledDate": "<YYYY-MM-DD, must fall within the given month>",
      "platforms": ["Instagram", "Facebook", "TikTok", "YouTube", "Website"],
      "notes": "<optional internal note>"
    }
  ]
}

Rules:
- Every content item needs a "type", "title", and "scheduledDate" — these are required.
- Spread scheduledDate values realistically across the month (don't cluster everything on one day).
- Keep titles short and specific to the business, not generic ("Post 1").
- Only use platforms from the list above.
- Output raw JSON only — it will be pasted directly into SMMO's board importer.`;
