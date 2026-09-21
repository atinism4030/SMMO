'use client';

import { useState, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import {
  summarizeByType, BOARD_IMPORT_TEMPLATE, BOARD_IMPORT_AI_PROMPT,
  type NormalizedContentItem, type BoardImportValidationResult,
} from '@/lib/boardImport';
import { formatDate } from '@/lib/utils';
import type { IClient } from '@/types';
import { Upload, Download, Copy, AlertTriangle, Info, X, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

type Step = 'client' | 'json' | 'preview' | 'done';

interface Props {
  open: boolean;
  onClose: () => void;
  clients: IClient[];
  onImported: () => void;
}

export default function BoardImportModal({ open, onClose, clients, onImported }: Props) {
  const [step, setStep] = useState<Step>('client');
  const [clientId, setClientId] = useState('');
  const [rawJson, setRawJson] = useState('');
  const [validation, setValidation] = useState<BoardImportValidationResult | null>(null);
  const [items, setItems] = useState<NormalizedContentItem[]>([]);
  const [boardName, setBoardName] = useState('');
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [createdBoardId, setCreatedBoardId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedClient = clients.find((c) => c._id === clientId);

  function reset() {
    setStep('client'); setClientId(''); setRawJson(''); setValidation(null); setItems([]); setBoardName(''); setCreatedBoardId(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRawJson(String(reader.result ?? ''));
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const blob = new Blob([JSON.stringify(BOARD_IMPORT_TEMPLATE, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smmo-board-template.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyPrompt() {
    navigator.clipboard.writeText(BOARD_IMPORT_AI_PROMPT).then(
      () => toast.success('Prompt copied — paste it into ChatGPT'),
      () => toast.error('Could not copy prompt')
    );
  }

  async function handleValidate() {
    if (!rawJson.trim()) { toast.error('Paste or upload a JSON file first'); return; }
    setValidating(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawJson);
      } catch {
        setValidation({ valid: false, errors: ['The pasted content is not valid JSON — check for a missing comma or bracket.'], warnings: [], boardName: '', month: 0, year: 0, items: [] });
        setStep('preview');
        return;
      }
      const res = await fetch('/api/boards/import/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, json: parsed }),
      });
      const result: BoardImportValidationResult = await res.json();
      setValidation(result);
      setItems(result.items);
      setBoardName(result.boardName);
      setStep('preview');
    } finally { setValidating(false); }
  }

  function removeItem(sourceIndex: number) {
    setItems((prev) => prev.filter((i) => i.sourceIndex !== sourceIndex));
  }

  async function handleConfirmImport() {
    if (!validation) return;
    setImporting(true);
    try {
      const res = await fetch('/api/boards/import/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, boardName, month: validation.month, year: validation.year, items }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes('already exists')) {
          if (!confirm(`${data.error} Import anyway (adds items to a new board)?`)) return;
          const retry = await fetch('/api/boards/import/confirm', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId, boardName, month: validation.month, year: validation.year, items, confirmDuplicate: true }),
          });
          const retryData = await retry.json();
          if (!retry.ok) { toast.error(retryData.error ?? 'Import failed'); return; }
          setCreatedBoardId(retryData.board._id);
          setStep('done');
          onImported();
          return;
        }
        toast.error(data.error ?? 'Import failed');
        return;
      }
      setCreatedBoardId(data.board._id);
      setStep('done');
      onImported();
    } finally { setImporting(false); }
  }

  const summary = summarizeByType(items);
  const summaryLabel = Object.entries(summary).map(([type, count]) => `${count} ${type.charAt(0)}${type.slice(1).toLowerCase()}${count === 1 ? '' : 's'}`).join(', ');

  return (
    <Modal open={open} onClose={handleClose} title="Import Content Plan" size="lg"
      footer={
        step === 'client' ? (
          <><Button variant="secondary" onClick={handleClose}>Cancel</Button><Button onClick={() => setStep('json')} disabled={!clientId}>Next</Button></>
        ) : step === 'json' ? (
          <><Button variant="secondary" onClick={() => setStep('client')}>Back</Button><Button onClick={handleValidate} loading={validating}>Validate</Button></>
        ) : step === 'preview' ? (
          <>
            <Button variant="secondary" onClick={() => setStep('json')}>Back</Button>
            <Button onClick={handleConfirmImport} loading={importing} disabled={!validation?.valid}>Create Board</Button>
          </>
        ) : (
          <Button onClick={handleClose}>Done</Button>
        )
      }>
      {step === 'client' && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Choose which client this content plan belongs to.</p>
          <Select label="Client *" value={clientId} onChange={(e) => setClientId(e.target.value)}
            options={[{ value: '', label: '— Select Client —' }, ...clients.map((c) => ({ value: c._id, label: c.name }))]} />
        </div>
      )}

      {step === 'json' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={downloadTemplate}><Download size={13} />Download JSON Template</Button>
            <Button variant="secondary" size="sm" onClick={copyPrompt}><Copy size={13} />Copy AI Prompt</Button>
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}><Upload size={13} />Upload File</Button>
            <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileUpload} />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Plan the month with ChatGPT using the prompt above, paste the exported JSON below (or upload the file), then validate.
          </p>
          <textarea
            value={rawJson} onChange={(e) => setRawJson(e.target.value)} rows={14} placeholder="Paste the board JSON here…"
            className="w-full px-3 py-2.5 rounded-lg text-xs font-mono border resize-none"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      )}

      {step === 'preview' && validation && (
        <div className="space-y-4">
          {validation.errors.length > 0 && (
            <div className="rounded-lg border p-3 space-y-1" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)' }}>
              <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5"><AlertTriangle size={13} />Fix these before importing</p>
              {validation.errors.map((e, i) => <p key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>{e}</p>)}
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="rounded-lg border p-3 space-y-1" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.06)' }}>
              <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5"><Info size={13} />Worth checking</p>
              {validation.warnings.map((w, i) => <p key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>{w}</p>)}
            </div>
          )}

          {validation.valid && (
            <>
              <Input label="Board Name" value={boardName} onChange={(e) => setBoardName(e.target.value)} />
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{selectedClient?.name} — {items.length} item{items.length === 1 ? '' : 's'}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{summaryLabel}</p>
              </div>
              <div className="rounded-xl border overflow-hidden divide-y max-h-72 overflow-y-auto" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                {items.map((item) => (
                  <div key={item.sourceIndex} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{item.contentType}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(item.scheduledDate)}{item.platforms.length > 0 ? ` · ${item.platforms.join(', ')}` : ''}</p>
                    </div>
                    <button onClick={() => removeItem(item.sourceIndex)} className="p-1 text-red-400 hover:text-red-300 flex-shrink-0"><X size={13} /></button>
                  </div>
                ))}
                {items.length === 0 && <p className="text-xs px-3 py-4 text-center" style={{ color: 'var(--text-muted)' }}>No items — the board will be created empty.</p>}
              </div>
            </>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-6 space-y-3">
          <CheckCircle2 size={36} className="mx-auto" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Board created with {items.length} item{items.length === 1 ? '' : 's'}.</p>
          {createdBoardId && <Link href={`/boards/${createdBoardId}`} className="text-xs underline" style={{ color: 'var(--text-secondary)' }}>View Board →</Link>}
        </div>
      )}
    </Modal>
  );
}
