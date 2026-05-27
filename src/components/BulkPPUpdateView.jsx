// src/components/BulkPPUpdateView.jsx
// ─────────────────────────────────────────────────────────────
// Bulk Purchase Price update via CSV upload.
// 3 stages:
//   Stage 1 — Download blank template + instructions
//   Stage 2 — Upload filled CSV, client-side parse + validate
//   Stage 3 — Preview table (valid + error rows), confirm import
//
// CSV format expected: two columns — SKU, PP
// Validation (client-side):
//   - Exactly 2 columns: SKU and PP
//   - No empty SKU
//   - No duplicate SKUs in the file
//   - PP is a positive number
// Validation (server-side, during preview):
//   - SKU must exist in InternalProducts
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react';
import { downloadPPTemplate, validateBulkPP, bulkUpdatePP } from '../services/api';

// ── Stage constants ───────────────────────────────────────────
const STAGE = { UPLOAD: 'upload', PREVIEW: 'preview', DONE: 'done' };

// ── Formatters ────────────────────────────────────────────────
const fmt = (val) =>
  val != null
    ? '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    : '—';

// ── Parse CSV text → array of { sku, pp, rawPP, rowNum } ─────
// Only reads first two columns, ignores extra columns.
// Returns { rows, fileErrors } where fileErrors are fatal issues
// that prevent any processing (wrong headers, empty file).
//
// FIX: strips UTF-8 BOM (\uFEFF) that Excel adds when saving as CSV.
// Also strips all non-printable / non-ASCII chars from headers so
// hidden unicode marks don't cause false "invalid headers" errors.
function parseCSV(text) {
  // Strip UTF-8 BOM that Excel prepends to CSV files
  const cleaned = text.replace(/^\uFEFF/, '');

  const lines = cleaned
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    return { rows: [], fileErrors: ['The file is empty.'] };
  }

  // ── Header check ──────────────────────────────────────────
  // Strip any remaining non-ASCII / invisible chars per header cell
  // (extra safety beyond BOM strip, handles edge cases from other editors)
  const headers = lines[0]
    .split(',')
    .map(h => h.replace(/[^\x20-\x7E]/g, '').trim().toLowerCase());

  if (headers[0] !== 'sku' || headers[1] !== 'pp') {
    return {
      rows: [],
      fileErrors: [
        `Invalid headers. Expected "SKU,PP" but got "${lines[0].replace(/[^\x20-\x7E]/g, '')}". ` +
        'Download the template and use it as the starting point.',
      ],
    };
  }

  if (lines.length === 1) {
    return { rows: [], fileErrors: ['The file has headers but no data rows.'] };
  }

  // ── Parse data rows ───────────────────────────────────────
  const rows = [];
  const seenSKUs = new Map(); // lowercase sku → first rowNum

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    // Strip BOM / invisible unicode chars from each cell value
    const rawSKU = (parts[0] ?? '').replace(/[^\x20-\x7E]/g, '').trim();
    const rawPP  = (parts[1] ?? '').replace(/[^\x20-\x7E]/g, '').trim();
    const rowNum = i + 1; // 1-based, header is row 1

    rows.push({ sku: rawSKU, rawPP, rowNum, errors: [] });

    // Track duplicates
    const skuKey = rawSKU.toLowerCase();
    if (seenSKUs.has(skuKey)) {
      // Mark both the first occurrence and this one
      const firstIdx = seenSKUs.get(skuKey);
      if (!rows[firstIdx].errors.includes('Duplicate SKU')) {
        rows[firstIdx].errors.push('Duplicate SKU');
      }
      rows[rows.length - 1].errors.push('Duplicate SKU');
    } else {
      seenSKUs.set(skuKey, rows.length - 1);
    }
  }

  // ── Per-row validation ────────────────────────────────────
  for (const row of rows) {
    if (!row.sku) {
      row.errors.push('SKU is empty');
    }

    const ppNum = parseFloat(row.rawPP);
    if (row.rawPP === '' || row.rawPP === null) {
      row.errors.push('PP is empty');
    } else if (isNaN(ppNum)) {
      row.errors.push(`PP "${row.rawPP}" is not a number`);
    } else if (ppNum <= 0) {
      row.errors.push('PP must be greater than 0');
    } else {
      row.pp = ppNum;
    }
  }

  return { rows, fileErrors: [] };
}

// ── Drop zone component ───────────────────────────────────────
function DropZone({ onFile, disabled }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  function handleChange(e) {
    const file = e.target.files[0];
    if (file) onFile(file);
    e.target.value = ''; // reset so same file can be re-selected
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center gap-3
        border-2 border-dashed rounded-xl px-8 py-12
        transition-colors cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed border-slate-700' :
          dragging
            ? 'border-violet-400 bg-violet-900/20'
            : 'border-slate-600 hover:border-violet-500 hover:bg-slate-800/40'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      <div className="w-10 h-10 rounded-xl bg-slate-700/60 flex items-center justify-center">
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm text-slate-300 font-medium">
          {dragging ? 'Drop it here' : 'Drop CSV file here'}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">or click to browse</p>
      </div>
    </div>
  );
}

// ── Row status badge ──────────────────────────────────────────
function StatusBadge({ errors, skuError }) {
  const allErrors = [...(errors || []), ...(skuError ? [skuError] : [])];
  if (allErrors.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Valid
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      {allErrors.map((e, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400">
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {e}
        </span>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function BulkPPUpdateView({ onClose, user }) {
  const [stage, setStage]               = useState(STAGE.UPLOAD);
  const [fileName, setFileName]         = useState('');
  const [parsedRows, setParsedRows]     = useState([]);
  const [fileErrors, setFileErrors]     = useState([]);
  const [skuErrors, setSkuErrors]       = useState({}); // { sku: errorMsg }
  const [validating, setValidating]     = useState(false);
  const [importing, setImporting]       = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // ── Download blank template ───────────────────────────────
  async function handleDownloadTemplate() {
    setDownloadLoading(true);
    try {
      await downloadPPTemplate();
    } catch (err) {
      console.error('Template download failed:', err);
    } finally {
      setDownloadLoading(false);
    }
  }

  // ── Handle file selected ──────────────────────────────────
  async function handleFile(file) {
    if (!file.name.endsWith('.csv')) {
      setFileErrors(['Please upload a .csv file.']);
      return;
    }

    setFileName(file.name);
    setFileErrors([]);
    setParsedRows([]);
    setSkuErrors({});

    const text = await file.text();
    const { rows, fileErrors: ferrs } = parseCSV(text);

    if (ferrs.length > 0) {
      setFileErrors(ferrs);
      return;
    }

    setParsedRows(rows);

    // ── Server-side SKU validation ────────────────────────
    const clientValidRows = rows.filter(r => r.errors.length === 0);
    if (clientValidRows.length === 0) {
      // All rows have client errors — go to preview to show them
      setStage(STAGE.PREVIEW);
      return;
    }

    setValidating(true);
    try {
      const skusToCheck = clientValidRows.map(r => r.sku);
      const result = await validateBulkPP(skusToCheck);
      // result.notFound = array of SKUs that don't exist in DB
      const newSkuErrors = {};
      for (const sku of (result.notFound || [])) {
        newSkuErrors[sku.toLowerCase()] = 'SKU not found in system';
      }
      setSkuErrors(newSkuErrors);
    } catch (err) {
      setFileErrors(['Server validation failed. Check the API server.']);
      setValidating(false);
      return;
    }
    setValidating(false);
    setStage(STAGE.PREVIEW);
  }

  // ── Compute final valid/invalid split ────────────────────
  const rowsWithStatus = parsedRows.map(row => ({
    ...row,
    skuError: skuErrors[(row.sku || '').toLowerCase()] || null,
  }));

  const validRows   = rowsWithStatus.filter(r => r.errors.length === 0 && !r.skuError);
  const invalidRows = rowsWithStatus.filter(r => r.errors.length > 0 || r.skuError);
  const canImport   = validRows.length > 0 && invalidRows.length === 0;

  // ── Handle import ─────────────────────────────────────────
  async function handleImport() {
    if (!canImport) return;
    setImporting(true);

    try {
      const payload = validRows.map(r => ({ skuId: r.sku, newPP: r.pp }));
      const result  = await bulkUpdatePP(payload);
      setImportResult(result);
      setStage(STAGE.DONE);
    } catch (err) {
      setFileErrors([err?.response?.data?.error || err.message || 'Import failed']);
    } finally {
      setImporting(false);
    }
  }

  // ── Reset to upload stage ─────────────────────────────────
  function handleReset() {
    setStage(STAGE.UPLOAD);
    setFileName('');
    setParsedRows([]);
    setFileErrors([]);
    setSkuErrors({});
    setImportResult(null);
  }

  return (
    <div className="min-h-screen bg-[#0f1117] font-sans">

      {/* ── Header ── */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="w-px h-5 bg-slate-700" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600/80 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-tight">Bulk PP Update</h1>
                <p className="text-xs text-slate-500">Upload a CSV to update multiple purchase prices at once</p>
              </div>
            </div>
          </div>

          {/* Stage indicator */}
          <div className="flex items-center gap-2">
            {['Upload', 'Preview', 'Done'].map((label, i) => {
              const stageKey = [STAGE.UPLOAD, STAGE.PREVIEW, STAGE.DONE][i];
              const isActive  = stage === stageKey;
              const isDone    = (
                (stageKey === STAGE.UPLOAD  && stage !== STAGE.UPLOAD) ||
                (stageKey === STAGE.PREVIEW && stage === STAGE.DONE)
              );
              return (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && <div className="w-4 h-px bg-slate-700" />}
                  <div className={`flex items-center gap-1.5 text-xs font-medium
                    ${isActive ? 'text-violet-400' : isDone ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold
                      ${isActive ? 'bg-violet-600 text-white' :
                        isDone   ? 'bg-emerald-600 text-white' :
                                   'bg-slate-700 text-slate-500'}`}
                    >
                      {isDone ? '✓' : i + 1}
                    </div>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 py-10">

        {/* ══════════════════════════════════════════════════════
            STAGE 1 — UPLOAD
        ══════════════════════════════════════════════════════ */}
        {stage === STAGE.UPLOAD && (
          <div className="max-w-2xl mx-auto">

            {/* Instructions card */}
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-6 mb-6">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How to use
              </h2>
              <ol className="space-y-3">
                {[
                  { n: '1', text: 'Download the CSV template below — it has two columns: SKU and PP.' },
                  { n: '2', text: 'Fill in the SKUs and new purchase prices. Only add the products you want to update — leave the rest blank or remove those rows.' },
                  { n: '3', text: 'Save the file as CSV and upload it here. You\'ll see a preview before anything is saved.' },
                ].map(item => (
                  <li key={item.n} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-violet-900/60 border border-violet-700/60
                      text-violet-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {item.n}
                    </span>
                    <span className="text-xs text-slate-300 leading-relaxed">{item.text}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Template format preview */}
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 mb-6">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
                Template format
              </p>
              <div className="font-mono text-xs">
                <div className="flex gap-0">
                  <div className="bg-slate-700/60 text-slate-300 px-4 py-1.5 rounded-tl-md border-b border-slate-600 font-semibold">SKU</div>
                  <div className="bg-slate-700/60 text-slate-300 px-4 py-1.5 rounded-tr-md border-b border-l border-slate-600 font-semibold">PP</div>
                </div>
                {[
                  ['AMD-5600X', '6900'],
                  ['INTEL-12400F', '7200'],
                  ['CP-9020281-IN', '3500'],
                ].map(([sku, pp], i) => (
                  <div key={i} className="flex">
                    <div className={`px-4 py-1 text-violet-300 border-b border-slate-700/60 w-36
                      ${i === 2 ? 'rounded-bl-md' : ''}`}>{sku}</div>
                    <div className={`px-4 py-1 text-emerald-300 border-b border-l border-slate-700/60
                      ${i === 2 ? 'rounded-br-md' : ''}`}>{pp}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Download button */}
            <button
              onClick={handleDownloadTemplate}
              disabled={downloadLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-6
                rounded-xl border border-emerald-700/60 bg-emerald-900/20 hover:bg-emerald-900/40
                text-emerald-400 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {downloadLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              {downloadLoading ? 'Preparing...' : 'Download CSV Template'}
            </button>

            {/* File errors */}
            {fileErrors.length > 0 && (
              <div className="p-4 rounded-xl bg-red-900/30 border border-red-700/50 mb-4">
                {fileErrors.map((e, i) => (
                  <p key={i} className="text-xs text-red-400">{e}</p>
                ))}
              </div>
            )}

            {/* Drop zone */}
            <DropZone onFile={handleFile} disabled={validating} />

            {/* Validating spinner */}
            {validating && (
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
                <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                Validating SKUs against database...
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STAGE 2 — PREVIEW
        ══════════════════════════════════════════════════════ */}
        {stage === STAGE.PREVIEW && (
          <div>
            {/* Summary bar */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-xs text-slate-400">{fileName}</span>
                </div>
                <span className="text-xs text-slate-500">{rowsWithStatus.length} rows parsed</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full
                  ${validRows.length > 0 ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50' : 'bg-slate-800 text-slate-500'}`}>
                  ✅ {validRows.length} valid
                </span>
                {invalidRows.length > 0 && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-900/40 text-red-400 border border-red-700/50">
                    ❌ {invalidRows.length} errors
                  </span>
                )}
              </div>
            </div>

            {/* Error notice if any */}
            {invalidRows.length > 0 && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-900/20 border border-red-700/40 mb-4 text-xs text-red-300">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  Fix all {invalidRows.length} error{invalidRows.length > 1 ? 's' : ''} before importing.
                  Correct the CSV file and re-upload.
                </span>
              </div>
            )}

            {/* Preview table */}
            <div className="rounded-xl border border-slate-700/60 shadow-2xl overflow-hidden mb-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700">
                    {['Row', 'SKU', 'New PP', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider
                        first:text-center text-left last:text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowsWithStatus.map((row, i) => {
                    const hasError = row.errors.length > 0 || row.skuError;
                    return (
                      <tr key={i}
                        className={`border-b border-slate-800 transition-colors
                          ${hasError ? 'bg-red-900/10' : i % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/20'}`}
                      >
                        <td className="px-4 py-3 text-center">
                          <span className="text-slate-600 text-xs">{row.rowNum}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-mono text-xs ${hasError ? 'text-red-300' : 'text-violet-300'}`}>
                            {row.sku || <span className="text-slate-600 italic">empty</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${hasError ? 'text-slate-500' : 'text-emerald-400'}`}>
                            {row.pp ? fmt(row.pp) : (
                              <span className="text-slate-600 text-xs">{row.rawPP || '—'}</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge errors={row.errors} skuError={row.skuError} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg
                  bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Upload different file
              </button>

              <button
                onClick={handleImport}
                disabled={!canImport || importing}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg
                  transition-colors
                  ${canImport && !importing
                    ? 'bg-violet-600 hover:bg-violet-500 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
              >
                {importing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Importing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M5 13l4 4L19 7" />
                    </svg>
                    {canImport
                      ? `Confirm & Import ${validRows.length} row${validRows.length !== 1 ? 's' : ''}`
                      : invalidRows.length > 0
                        ? `Fix ${invalidRows.length} error${invalidRows.length !== 1 ? 's' : ''} first`
                        : 'No valid rows'
                    }
                  </>
                )}
              </button>
            </div>

            {/* Import error */}
            {fileErrors.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-red-900/30 border border-red-700/50">
                {fileErrors.map((e, i) => (
                  <p key={i} className="text-xs text-red-400">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STAGE 3 — DONE
        ══════════════════════════════════════════════════════ */}
        {stage === STAGE.DONE && importResult && (
          <div className="max-w-lg mx-auto text-center py-12">
            {/* Success icon */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-900/40 border border-emerald-700/60
              flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Import Complete</h2>
            <p className="text-slate-400 text-sm mb-8">
              Purchase prices have been updated successfully.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/20 p-4">
                <p className="text-xs text-slate-500 mb-1">Updated</p>
                <p className="text-2xl font-bold text-emerald-400">{importResult.updated}</p>
                <p className="text-xs text-slate-500 mt-0.5">rows in DB</p>
              </div>
              <div className="rounded-xl border border-slate-700/40 bg-slate-900/20 p-4">
                <p className="text-xs text-slate-500 mb-1">Updated by</p>
                <p className="text-sm font-semibold text-slate-300 mt-1 truncate">{importResult.updatedBy}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(importResult.updatedAt).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {/* Info note */}
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-slate-800/60
              border border-slate-700/60 text-xs text-slate-400 text-left mb-8">
              <svg className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                PP values are now updated. Run the recommendation engine
                (<code className="text-violet-300 bg-slate-700 px-1 rounded">npm run recommend</code>)
                to recalculate RecommendedSP for affected products.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-xs font-medium rounded-lg
                  bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              >
                Upload another file
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg
                  bg-violet-600 hover:bg-violet-500 text-white transition-colors"
              >
                Back to dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}