import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert, FileText, Upload, AlertTriangle,
  ArrowRight, Zap, Eye, RefreshCw, ChevronDown, ChevronUp,
  Sparkles, TrendingDown, BookOpen, ExternalLink, X, ThumbsUp,
  ThumbsDown, MessageSquare, Download, Send, CheckSquare,
  Layers, Search, ZoomIn, ZoomOut, ChevronLeft, ChevronRight
} from 'lucide-react';

// ─── GUARDRAILS ────────────────────────────────────────────────────────────────
const ALLOWED_RISK   = ['High', 'Medium', 'Low'];
const ALLOWED_FAVORS = ['Company', 'User', 'Both', 'Neutral'];

function sanitize(str, max = 800) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().slice(0, max);
}
function validateClause(c) {
  return c && typeof c.clause_title === 'string' && ALLOWED_RISK.includes(c.risk_level)
    && typeof c.plain_english === 'string' && typeof c.why_risky === 'string';
}
function validateResponse(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const errors = [];
  if (!raw.document_name)                      errors.push('Missing document_name');
  if (!ALLOWED_RISK.includes(raw.overall_risk)) errors.push('Invalid overall_risk value');
  if (!Array.isArray(raw.top_red_flags))        errors.push('top_red_flags must be an array');
  if (!Array.isArray(raw.clauses))              errors.push('clauses must be an array');
  const validClauses = (raw.clauses || []).filter(validateClause).map(c => ({
    clause_title:       sanitize(c.clause_title, 120),
    plain_english:      sanitize(c.plain_english, 600),
    risk_level:         c.risk_level,
    why_risky:          sanitize(c.why_risky, 600),
    who_it_favors:      ALLOWED_FAVORS.includes(c.who_it_favors) ? c.who_it_favors : 'Neutral',
    original_text:      sanitize(c.original_text || c.plain_english, 800),
    alternate_clause:   sanitize(c.alternate_clause || '', 800),
    improvement_reason: sanitize(c.improvement_reason || '', 600),
    risk_after_fix:     ALLOWED_RISK.includes(c.risk_after_fix) ? c.risk_after_fix : 'Low',
    data_citation:      sanitize(c.data_citation || '', 400),
    data_citation_url:  typeof c.data_citation_url === 'string' ? c.data_citation_url : null,
  }));
  if (errors.length > 0) return { _errors: errors };
  return {
    document_name: sanitize(raw.document_name, 200),
    overall_risk:  raw.overall_risk,
    summary:       sanitize(raw.summary, 1000),
    top_red_flags: (raw.top_red_flags || []).map(f => sanitize(f, 300)).filter(Boolean).slice(0, 10),
    clauses:       validClauses,
  };
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function riskColor(level) {
  if (level === 'High')   return { bg:'#FEF2F2', border:'#FECACA', badge:'#FEE2E2', badgeText:'#B91C1C' };
  if (level === 'Medium') return { bg:'#FFFBEB', border:'#FDE68A', badge:'#FEF3C7', badgeText:'#B45309' };
  return { bg:'#F0FDF4', border:'#BBF7D0', badge:'#DCFCE7', badgeText:'#15803D' };
}
function riskScore(l) { return l === 'High' ? 3 : l === 'Medium' ? 2 : 1; }

function RiskDelta({ before, after }) {
  const delta = riskScore(before) - riskScore(after);
  if (delta <= 0) return null;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:'#DCFCE7', color:'#14532D', borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:600 }}>
      <TrendingDown size={13}/> Risk: {before} → {after}
    </span>
  );
}

function highlightDiff(original, revised) {
  const ow = original.split(' '), rw = revised.split(' ');
  const max = Math.max(ow.length, rw.length);
  const origOut = [], revOut = [];
  for (let i = 0; i < max; i++) {
    const o = ow[i] || '', r = rw[i] || '';
    if (o === r) {
      origOut.push(<span key={i}>{o} </span>);
      revOut.push(<span key={i}>{r} </span>);
    } else if (!r) {
      origOut.push(<mark key={i} style={{ background:'#FEE2E2', color:'#991B1B', borderRadius:3, padding:'1px 3px' }}>{o} </mark>);
    } else if (!o) {
      revOut.push(<mark key={i} style={{ background:'#DCFCE7', color:'#14532D', borderRadius:3, padding:'1px 3px' }}>{r} </mark>);
    } else {
      origOut.push(<mark key={i} style={{ background:'#FEE2E2', color:'#991B1B', borderRadius:3, padding:'1px 3px', textDecoration:'line-through' }}>{o} </mark>);
      revOut.push(<mark key={i} style={{ background:'#DCFCE7', color:'#14532D', borderRadius:3, padding:'1px 3px' }}>{r} </mark>);
    }
  }
  return { origOut, revOut };
}

// ─── MOCK BACKEND ──────────────────────────────────────────────────────────────
function mockBackendResponse(filename) {
  return {
    document_name: filename, overall_risk: 'Medium',
    summary: 'This software licence agreement contains several clauses that disproportionately favour the provider. The auto-renewal mechanism, liability cap, and data-sharing provisions represent material risks that should be renegotiated before signing.',
    top_red_flags: [
      'Automatic 12-month renewal without email notice — 90 days written cancellation required',
      'Provider can change pricing with only 7 days notice, unilaterally',
      'Unlimited data harvesting permitted for third-party marketing purposes',
    ],
    clauses: [
      {
        clause_title: 'Section 4.2: Auto-Renewal', risk_level: 'High', who_it_favors: 'Company',
        plain_english: 'The contract resets itself every year and charges you automatically.',
        why_risky: 'Requires 90-day written notice to cancel. Missing the window locks you in for another full year.',
        original_text: 'This Agreement shall automatically renew for successive one (1) year terms unless either party provides written notice of non-renewal at least ninety (90) days prior to the end of the then-current term.',
        alternate_clause: 'This Agreement shall automatically renew for successive one (1) year terms unless either party provides written notice of non-renewal at least thirty (30) days prior to the end of the then-current term. Provider shall send written renewal notice to Customer no less than sixty (60) days before any renewal date.',
        improvement_reason: 'Reduces notice window from 90 to 30 days and requires the provider to actively notify you before renewal.',
        risk_after_fix: 'Low',
        data_citation: 'Per the 2024 Thomson Reuters Contract Lifecycle Report, 67% of auto-renewal disputes stem from inadequate advance notice.',
        data_citation_url: 'https://www.ftc.gov/business-guidance/negative-option',
      },
      {
        clause_title: 'Section 8.1: Liability Cap', risk_level: 'High', who_it_favors: 'Company',
        plain_english: "If they lose your data or breach the contract, you can't sue for more than $50.",
        why_risky: 'A $50 damage cap is grossly inadequate given potential data breach costs.',
        original_text: "IN NO EVENT SHALL PROVIDER'S TOTAL LIABILITY EXCEED FIFTY DOLLARS ($50.00) REGARDLESS OF THE FORM OF ACTION.",
        alternate_clause: "Provider's total liability for any claim shall not exceed the greater of (a) fees paid in the twelve (12) months preceding the claim, or (b) Five Thousand Dollars ($5,000). This cap shall not apply to breaches of confidentiality, gross negligence, or wilful misconduct.",
        improvement_reason: 'Ties liability to actual contract value. Carve-outs for wilful misconduct ensure the provider cannot cap liability for their worst failures.',
        risk_after_fix: 'Low',
        data_citation: 'IBM Cost of a Data Breach Report 2024: average SMB breach cost is $4.88M.',
        data_citation_url: 'https://www.ibm.com/reports/data-breach',
      },
      {
        clause_title: 'Section 12: Data Privacy', risk_level: 'Medium', who_it_favors: 'Company',
        plain_english: 'They can use your usage statistics to improve their own AI models.',
        why_risky: 'May conflict with your privacy obligations if your data contains personal information of your customers.',
        original_text: 'Customer grants Provider a non-exclusive, royalty-free licence to use anonymised Customer usage data for product improvement, analytics, and machine-learning model training purposes.',
        alternate_clause: 'Customer grants Provider a non-exclusive, royalty-free licence to use anonymised aggregate usage data solely for product improvement and analytics. Provider shall not use Customer data to train any machine-learning model without explicit prior written consent. Customer may opt out at any time.',
        improvement_reason: 'Separates analytics from AI training, adds an explicit opt-out right, and requires affirmative consent for model training.',
        risk_after_fix: 'Low',
        data_citation: 'GDPR Article 22 and CCPA §1798.120 require explicit consent for automated decision-making using personal data.',
        data_citation_url: 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/',
      },
    ],
  };
}

// ─── PDF VIEWER ────────────────────────────────────────────────────────────────
// Uses PDF.js loaded from CDN. Renders each page to <canvas>, then draws
// a transparent highlight overlay for each clause found via text search.
const PDFJS_CDN    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function PdfViewer({ file, clauses, focusClauseIndex, onClose }) {
  const [pdfDoc,   setPdfDoc]   = useState(null);
  const [pageNum,  setPageNum]  = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale,    setScale]    = useState(1.3);
  const [status,   setStatus]   = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  // matchMap: { pageNum: [ { clause_title, risk_level, rect:{x,y,w,h} } ] }
  const [matchMap, setMatchMap] = useState({});
  const canvasRef    = useRef(null);
  const overlayRef   = useRef(null);
  const renderCancel = useRef(null);

  // Load PDF.js once, then parse the file
  useEffect(() => {
    if (window.pdfjsLib) { parsePdf(); return; }
    const s  = document.createElement('script');
    s.src    = PDFJS_CDN;
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; parsePdf(); };
    s.onerror = () => { setErrorMsg('Could not load PDF.js from CDN.'); setStatus('error'); };
    document.head.appendChild(s);
  }, []);

  async function parsePdf() {
    setStatus('loading');
    try {
      const buf = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      const map = await buildMatchMap(pdf);
      setMatchMap(map);
      // jump to first flagged page
      const firstFlagged = Object.keys(map).map(Number).sort((a, b) => a - b)[0];
      if (firstFlagged) setPageNum(firstFlagged);
      setStatus('ready');
    } catch (err) {
      setErrorMsg('Failed to parse PDF: ' + err.message);
      setStatus('error');
    }
  }

  async function buildMatchMap(pdf) {
    const map = {};
    for (let p = 1; p <= pdf.numPages; p++) {
      const page  = await pdf.getPage(p);
      const vp    = page.getViewport({ scale: 1 });
      const tc    = await page.getTextContent();
      const items = tc.items;

      // Build a flat string + segment index for search
      let full = '';
      const segs = [];
      for (const item of items) {
        segs.push({ start: full.length, str: item.str, tx: item.transform[4], ty: item.transform[5], w: item.width, h: Math.abs(item.transform[3]) || 10 });
        full += item.str + ' ';
      }
      const fullLower = full.toLowerCase();

      for (const clause of clauses) {
        // Use first 55 chars of original_text as search needle
        const needle = clause.original_text.trim().slice(0, 55).toLowerCase().replace(/\s+/g, ' ');
        if (needle.length < 10) continue;
        const idx = fullLower.indexOf(needle);
        if (idx === -1) continue;

        const end  = idx + needle.length;
        const hits = segs.filter(s => s.start < end && s.start + s.str.length + 1 > idx);
        if (!hits.length) continue;

        const xs = hits.map(s => s.tx);
        const ys = hits.map(s => vp.height - s.ty);   // PDF coords: y=0 at bottom
        const x  = Math.min(...xs);
        const y  = Math.min(...ys) - hits[0].h;
        const w  = Math.max(...hits.map(s => s.tx + s.w)) - x;
        const h  = Math.max(...ys) - y + hits[0].h;

        if (!map[p]) map[p] = [];
        map[p].push({ clause_title: clause.clause_title, risk_level: clause.risk_level, rect: { x, y, w, h } });
      }
    }
    return map;
  }

  // Jump to the page containing focusClauseIndex
  useEffect(() => {
    if (focusClauseIndex == null || !clauses[focusClauseIndex]) return;
    const title = clauses[focusClauseIndex].clause_title;
    for (const [p, hits] of Object.entries(matchMap)) {
      if (hits.some(h => h.clause_title === title)) { setPageNum(Number(p)); return; }
    }
  }, [focusClauseIndex, matchMap]);

  // Render page + overlay whenever page/scale changes
  useEffect(() => {
    if (status !== 'ready' || !pdfDoc || !canvasRef.current) return;
    if (renderCancel.current) renderCancel.current.cancel();

    (async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const vp   = page.getViewport({ scale });
        const cv   = canvasRef.current;
        cv.width   = vp.width;
        cv.height  = vp.height;
        const ctx  = cv.getContext('2d');

        const task = page.render({ canvasContext: ctx, viewport: vp });
        renderCancel.current = task;
        await task.promise;

        // Draw highlight overlay
        const ov  = overlayRef.current;
        ov.width  = vp.width;
        ov.height = vp.height;
        const oc  = ov.getContext('2d');
        oc.clearRect(0, 0, ov.width, ov.height);

        const hits = matchMap[pageNum] || [];
        hits.forEach(h => {
          const { x, y, w, h: rh } = h.rect;
          const sx = x * scale, sy = y * scale, sw = Math.max(w * scale, 80), sh = Math.max(rh * scale, 14);
          if (h.risk_level === 'High') {
            oc.fillStyle   = 'rgba(239,68,68,0.22)';
            oc.strokeStyle = 'rgba(220,38,38,0.85)';
          } else {
            oc.fillStyle   = 'rgba(234,179,8,0.22)';
            oc.strokeStyle = 'rgba(202,138,4,0.85)';
          }
          oc.lineWidth = 2;
          oc.fillRect(sx, sy, sw, sh);
          oc.strokeRect(sx, sy, sw, sh);

          // Small label tag above highlight
          const tag  = h.clause_title.length > 28 ? h.clause_title.slice(0, 28) + '…' : h.clause_title;
          const fs   = Math.max(9, Math.round(10 * scale));
          oc.font    = `600 ${fs}px system-ui`;
          const tw   = oc.measureText(tag).width + 10;
          const ty2  = sy > fs + 6 ? sy - 4 : sy + sh + fs + 4;
          oc.fillStyle = h.risk_level === 'High' ? 'rgba(185,28,28,0.9)' : 'rgba(161,98,7,0.9)';
          oc.beginPath();
          oc.roundRect(sx, ty2 - fs - 2, tw, fs + 6, 4);
          oc.fill();
          oc.fillStyle = '#fff';
          oc.fillText(tag, sx + 5, ty2);
        });
      } catch { /* render cancelled or page unmounted */ }
    })();
  }, [pdfDoc, pageNum, scale, matchMap, status]);

  const pageHits  = matchMap[pageNum] || [];
  const totalHits = Object.values(matchMap).flat().length;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(2,8,23,0.85)', display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ background:'#0F172A', borderBottom:'1px solid #1E293B', padding:'10px 18px', display:'flex', alignItems:'center', gap:10, flexShrink:0, flexWrap:'wrap' }}>
        <div style={{ background:'linear-gradient(135deg,#2563EB,#1D4ED8)', borderRadius:8, padding:6, display:'flex' }}>
          <Layers size={17} color="#fff"/>
        </div>
        <span style={{ fontWeight:800, fontSize:15, color:'#F8FAFC' }}>PDF Viewer</span>
        <span style={{ fontSize:12, color:'#475569', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file?.name}</span>

        {/* Legend */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:13, height:13, background:'rgba(239,68,68,0.3)', border:'2px solid #EF4444', borderRadius:3, display:'inline-block' }}/>
            <span style={{ fontSize:12, color:'#FCA5A5', fontWeight:600 }}>High risk</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:13, height:13, background:'rgba(234,179,8,0.3)', border:'2px solid #EAB308', borderRadius:3, display:'inline-block' }}/>
            <span style={{ fontSize:12, color:'#FDE68A', fontWeight:600 }}>Medium risk</span>
          </div>
          <span style={{ fontSize:12, color:'#475569', marginLeft:4 }}>
            {totalHits > 0 ? `${totalHits} clause${totalHits!==1?'s':''} found` : 'Scanning…'}
          </span>
        </div>

        <button onClick={onClose} style={{ background:'#1E293B', border:'none', color:'#94A3B8', borderRadius:8, padding:'6px 9px', cursor:'pointer', marginLeft:4 }}>
          <X size={17}/>
        </button>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* Sidebar — jump list */}
        <div style={{ width:210, background:'#0B1120', borderRight:'1px solid #1E293B', overflowY:'auto', padding:10, flexShrink:0 }}>
          <p style={{ fontSize:10, fontWeight:700, color:'#334155', textTransform:'uppercase', letterSpacing:1, margin:'0 0 8px' }}>Flagged Clauses</p>

          {status === 'ready' && Object.keys(matchMap).length === 0 && (
            <p style={{ fontSize:11, color:'#475569', lineHeight:1.6, margin:0 }}>
              No clause text was located in this PDF. Ensure original_text in the backend response matches the document verbatim.
            </p>
          )}

          {Object.entries(matchMap).sort(([a],[b]) => Number(a)-Number(b)).map(([p, hits]) =>
            hits.map((h, i) => (
              <button key={`${p}-${i}`} onClick={() => setPageNum(Number(p))}
                style={{ width:'100%', textAlign:'left', background: Number(p)===pageNum ? '#1E293B' : 'transparent', border:'none', borderRadius:8, padding:'8px 9px', cursor:'pointer', marginBottom:3, borderLeft:`3px solid ${h.risk_level==='High'?'#EF4444':'#EAB308'}` }}>
                <p style={{ fontSize:11, fontWeight:700, color:'#E2E8F0', margin:'0 0 2px', lineHeight:1.3 }}>{h.clause_title}</p>
                <p style={{ fontSize:10, color:'#475569', margin:0 }}>Page {p} · {h.risk_level} risk</p>
              </button>
            ))
          )}
        </div>

        {/* Canvas */}
        <div style={{ flex:1, overflowY:'auto', overflowX:'auto', background:'#1A2235', display:'flex', flexDirection:'column', alignItems:'center', padding:'24px 20px 48px' }}>

          {status === 'loading' && (
            <div style={{ textAlign:'center', paddingTop:80 }}>
              <div style={{ width:44, height:44, border:'4px solid #1E293B', borderTopColor:'#2563EB', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 14px' }}/>
              <p style={{ color:'#94A3B8', fontSize:13 }}>Rendering PDF and scanning for clause text…</p>
            </div>
          )}

          {status === 'error' && (
            <div style={{ background:'#450A0A', border:'1px solid #7F1D1D', borderRadius:10, padding:'14px 20px', color:'#FCA5A5', fontSize:13, marginTop:40, maxWidth:480, textAlign:'center' }}>
              {errorMsg}
            </div>
          )}

          {status === 'ready' && (
            <div style={{ position:'relative' }}>
              {/* Glow rings around highlighted areas (visual polish) */}
              <canvas ref={canvasRef} style={{ display:'block', borderRadius:2, boxShadow:'0 8px 48px rgba(0,0,0,0.6)' }}/>
              <canvas ref={overlayRef} style={{ position:'absolute', top:0, left:0, pointerEvents:'none', borderRadius:2 }}/>

              {/* No-match notice shown inline */}
              {pageHits.length === 0 && totalHits === 0 && (
                <div style={{ position:'absolute', top:12, left:'50%', transform:'translateX(-50%)', background:'rgba(30,41,59,0.9)', border:'1px solid #334155', borderRadius:8, padding:'7px 14px', fontSize:12, color:'#94A3B8', whiteSpace:'nowrap', pointerEvents:'none' }}>
                  No flagged clauses on this page
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pagination bar */}
      {status === 'ready' && numPages > 0 && (
        <div style={{ background:'#0F172A', borderTop:'1px solid #1E293B', padding:'9px 20px', display:'flex', alignItems:'center', justifyContent:'center', gap:12, flexShrink:0 }}>
          <button onClick={() => setScale(s => Math.max(0.5, +(s-0.2).toFixed(1)))}
            style={{ background:'#1E293B', border:'none', color:'#94A3B8', borderRadius:7, padding:'5px 9px', cursor:'pointer' }}><ZoomOut size={15}/></button>
          <span style={{ fontSize:12, color:'#94A3B8', minWidth:46, textAlign:'center' }}>{Math.round(scale*100)}%</span>
          <button onClick={() => setScale(s => Math.min(3.0, +(s+0.2).toFixed(1)))}
            style={{ background:'#1E293B', border:'none', color:'#94A3B8', borderRadius:7, padding:'5px 9px', cursor:'pointer' }}><ZoomIn size={15}/></button>
          <div style={{ width:1, height:18, background:'#1E293B' }}/>
          <button onClick={() => setPageNum(p => Math.max(1, p-1))} disabled={pageNum===1}
            style={{ background:'#1E293B', border:'none', color: pageNum===1?'#334155':'#94A3B8', borderRadius:7, padding:'5px 9px', cursor: pageNum===1?'default':'pointer' }}><ChevronLeft size={15}/></button>
          <span style={{ fontSize:13, color:'#E2E8F0', fontWeight:600, minWidth:80, textAlign:'center' }}>Page {pageNum} / {numPages}</span>
          <button onClick={() => setPageNum(p => Math.min(numPages, p+1))} disabled={pageNum===numPages}
            style={{ background:'#1E293B', border:'none', color: pageNum===numPages?'#334155':'#94A3B8', borderRadius:7, padding:'5px 9px', cursor: pageNum===numPages?'default':'pointer' }}><ChevronRight size={15}/></button>

          {/* Quick-jump buttons for flagged pages */}
          {Object.keys(matchMap).length > 0 && (
            <>
              <div style={{ width:1, height:18, background:'#1E293B' }}/>
              <span style={{ fontSize:11, color:'#475569' }}>Jump:</span>
              {Object.keys(matchMap).sort((a,b)=>Number(a)-Number(b)).map(p => (
                <button key={p} onClick={() => setPageNum(Number(p))}
                  style={{ background: Number(p)===pageNum?'#2563EB':'#1E293B', border:'none', color: Number(p)===pageNum?'#fff':'#94A3B8', borderRadius:6, padding:'3px 9px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                  p{p}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CLAUSE REVIEW CARD ────────────────────────────────────────────────────────
function ClauseReviewCard({ clause, index, decision, onDecide, onRequestChange, chatHistory, onViewInPdf }) {
  const [expanded,  setExpanded]  = useState(false);
  const [showDiff,  setShowDiff]  = useState(false);
  const [chatOpen,  setChatOpen]  = useState(false);
  const [chatMsg,   setChatMsg]   = useState('');
  const [localChat, setLocalChat] = useState(chatHistory || []);
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef(null);
  const colors   = riskColor(clause.risk_level);
  const { origOut, revOut } = highlightDiff(clause.original_text, clause.alternate_clause);
  const isApproved = decision === 'approved';
  const isDenied   = decision === 'denied';

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [localChat]);

  async function sendChat() {
    if (!chatMsg.trim() || aiLoading) return;
    const userMsg = chatMsg.trim(); setChatMsg(''); setAiLoading(true);
    const updated = [...localChat, { role:'user', content:userMsg }];
    setLocalChat(updated);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          system: `You are a contract law assistant. Clause: ${clause.clause_title}. Original text: ${clause.original_text}. Proposed alternate: ${clause.alternate_clause}. Respond in 2-4 plain sentences. If asked to rewrite, prefix your rewritten clause with exactly: REVISED_CLAUSE:`,
          messages: updated.map(m => ({ role:m.role, content:m.content })),
        }),
      });
      const data  = await res.json();
      const reply = (data.content || []).map(b => b.text || '').join('');
      const newHistory = [...updated, { role:'assistant', content:reply }];
      setLocalChat(newHistory);
      const match = reply.match(/REVISED_CLAUSE:\s*([\s\S]+)/);
      onRequestChange(index, match ? match[1].trim() : null, newHistory);
    } catch {
      setLocalChat(prev => [...prev, { role:'assistant', content:'Connection error. Please try again.' }]);
    }
    setAiLoading(false);
  }

  return (
    <div style={{ border:`1.5px solid ${isApproved?'#86EFAC':isDenied?'#FCA5A5':colors.border}`, borderRadius:16, overflow:'hidden', background:'#fff', transition:'border-color 0.25s' }}>
      <div style={{ height:4, background: clause.risk_level==='High'?'#EF4444':clause.risk_level==='Medium'?'#F59E0B':'#22C55E' }}/>

      {/* Card header */}
      <div style={{ padding:'17px 20px', display:'flex', alignItems:'flex-start', gap:10, justifyContent:'space-between' }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:5 }}>
            <span style={{ fontWeight:700, fontSize:15, color:'#0F172A' }}>{clause.clause_title}</span>
            <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, background:colors.badge, color:colors.badgeText, padding:'2px 9px', borderRadius:20 }}>
              {clause.risk_level} Risk
            </span>
            {clause.alternate_clause && <RiskDelta before={clause.risk_level} after={clause.risk_after_fix}/>}
          </div>
          <p style={{ fontSize:13, color:'#475569', margin:0, fontStyle:'italic' }}>"{clause.plain_english}"</p>
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0, alignItems:'center' }}>
          <button onClick={() => onViewInPdf(index)}
            style={{ display:'flex', alignItems:'center', gap:5, background: clause.risk_level==='High'?'#FEF2F2':'#FFFBEB', border:`1px solid ${clause.risk_level==='High'?'#FECACA':'#FDE68A'}`, borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:12, fontWeight:600, color: clause.risk_level==='High'?'#B91C1C':'#92400E', whiteSpace:'nowrap' }}>
            <Search size={12}/> View in PDF
          </button>
          <button onClick={() => setExpanded(e => !e)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:4 }}>
            {expanded ? <ChevronUp size={19}/> : <ChevronDown size={19}/>}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop:'1px solid #F1F5F9', padding:'17px 20px', display:'flex', flexDirection:'column', gap:16 }}>

          {/* Why risky */}
          <div style={{ background:'#F8FAFC', borderRadius:10, padding:'11px 15px', borderLeft:'3px solid #EF4444' }}>
            <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#94A3B8', margin:'0 0 4px' }}>Why it matters</p>
            <p style={{ fontSize:13, color:'#334155', margin:0, lineHeight:1.6 }}>{clause.why_risky}</p>
          </div>

          {/* Alternate clause */}
          {clause.alternate_clause && (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                <Sparkles size={14} color="#7C3AED"/>
                <span style={{ fontSize:12, fontWeight:700, color:'#7C3AED', textTransform:'uppercase', letterSpacing:1 }}>Suggested Replacement</span>
                <button onClick={() => setShowDiff(d => !d)}
                  style={{ marginLeft:'auto', fontSize:11, color:'#6366F1', background:'#EEF2FF', border:'none', borderRadius:7, padding:'3px 9px', cursor:'pointer', fontWeight:600 }}>
                  {showDiff ? 'Hide diff' : 'Show diff'}
                </button>
              </div>

              {showDiff ? (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
                  <div style={{ background:'#FEF2F2', borderRadius:9, padding:11, border:'1px solid #FEE2E2' }}>
                    <p style={{ fontSize:10, fontWeight:700, color:'#991B1B', textTransform:'uppercase', letterSpacing:1, margin:'0 0 5px' }}>Original</p>
                    <p style={{ fontSize:12, lineHeight:1.7, color:'#1E293B', margin:0 }}>{origOut}</p>
                  </div>
                  <div style={{ background:'#F0FDF4', borderRadius:9, padding:11, border:'1px solid #BBF7D0' }}>
                    <p style={{ fontSize:10, fontWeight:700, color:'#14532D', textTransform:'uppercase', letterSpacing:1, margin:'0 0 5px' }}>Revised</p>
                    <p style={{ fontSize:12, lineHeight:1.7, color:'#1E293B', margin:0 }}>{revOut}</p>
                  </div>
                </div>
              ) : (
                <div style={{ background:'#F5F3FF', borderRadius:9, padding:11, border:'1px solid #DDD6FE' }}>
                  <p style={{ fontSize:13, lineHeight:1.7, color:'#1E293B', margin:0 }}>{clause.alternate_clause}</p>
                </div>
              )}

              {clause.improvement_reason && (
                <div style={{ marginTop:9, background:'#F0FDF4', borderRadius:9, padding:'10px 13px', border:'1px solid #BBF7D0' }}>
                  <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#15803D', margin:'0 0 3px' }}>What this fixes</p>
                  <p style={{ fontSize:12, color:'#166534', margin:0, lineHeight:1.6 }}>{clause.improvement_reason}</p>
                </div>
              )}

              {clause.data_citation && (
                <div style={{ marginTop:7, display:'flex', alignItems:'flex-start', gap:7, background:'#EFF6FF', borderRadius:9, padding:'9px 12px', border:'1px solid #BFDBFE' }}>
                  <BookOpen size={13} style={{ color:'#2563EB', marginTop:2, flexShrink:0 }}/>
                  <div>
                    <p style={{ fontSize:12, color:'#1E40AF', margin:0, lineHeight:1.5 }}>{clause.data_citation}</p>
                    {clause.data_citation_url && (
                      <a href={clause.data_citation_url} target="_blank" rel="noreferrer"
                        style={{ fontSize:11, color:'#3B82F6', display:'inline-flex', alignItems:'center', gap:3, marginTop:3 }}>
                        Source <ExternalLink size={10}/>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI chat */}
          <div>
            <button onClick={() => setChatOpen(o => !o)}
              style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#6366F1', background:'#EEF2FF', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontWeight:600 }}>
              <MessageSquare size={13}/> Ask AI to modify this clause
            </button>
            {chatOpen && (
              <div style={{ marginTop:9, border:'1px solid #E0E7FF', borderRadius:11, overflow:'hidden' }}>
                <div style={{ background:'#EEF2FF', padding:'6px 12px', fontSize:12, color:'#4338CA', fontWeight:600 }}>Chat with AI about this clause</div>
                <div style={{ maxHeight:170, overflowY:'auto', padding:10, display:'flex', flexDirection:'column', gap:6, background:'#FAFAFA' }}>
                  {localChat.length === 0 && <p style={{ fontSize:12, color:'#94A3B8', fontStyle:'italic', margin:0 }}>Ask to adjust notice periods, add carve-outs, change liability limits…</p>}
                  {localChat.map((m, i) => (
                    <div key={i} style={{ alignSelf: m.role==='user'?'flex-end':'flex-start', maxWidth:'85%' }}>
                      <div style={{ background: m.role==='user'?'#6366F1':'#fff', color: m.role==='user'?'#fff':'#1E293B', borderRadius: m.role==='user'?'11px 11px 2px 11px':'11px 11px 11px 2px', padding:'7px 11px', fontSize:12, lineHeight:1.5, border: m.role==='assistant'?'1px solid #E2E8F0':'none' }}>
                        {m.content.replace(/REVISED_CLAUSE:[\s\S]*/g, '').trim() || m.content}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div style={{ alignSelf:'flex-start', background:'#fff', border:'1px solid #E2E8F0', borderRadius:'11px 11px 11px 2px', padding:'7px 11px' }}>
                      <span style={{ display:'flex', gap:4 }}>{[0,1,2].map(i=><span key={i} style={{ width:5,height:5,borderRadius:'50%',background:'#94A3B8',animation:`pulse 1.2s ${i*0.2}s infinite` }}/>)}</span>
                    </div>
                  )}
                  <div ref={chatEndRef}/>
                </div>
                <div style={{ display:'flex', borderTop:'1px solid #E0E7FF', background:'#fff' }}>
                  <input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()}
                    placeholder="e.g. Reduce notice to 14 days, add mutual termination right…"
                    style={{ flex:1, border:'none', padding:'9px 12px', fontSize:12, outline:'none', background:'transparent' }}/>
                  <button onClick={sendChat} disabled={aiLoading} style={{ background:'#6366F1', border:'none', color:'#fff', padding:'0 13px', cursor:'pointer' }}><Send size={14}/></button>
                </div>
              </div>
            )}
          </div>

          {/* Approve / Deny */}
          {clause.alternate_clause && (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => onDecide(index, 'approved')}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 0', borderRadius:10, border:`2px solid ${isApproved?'#22C55E':'#E2E8F0'}`, background: isApproved?'#F0FDF4':'#fff', color: isApproved?'#15803D':'#64748B', fontWeight:700, fontSize:13, cursor:'pointer', transition:'all 0.2s' }}>
                <ThumbsUp size={14}/> {isApproved?'Approved ✓':'Apply this change'}
              </button>
              <button onClick={() => onDecide(index, 'denied')}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 0', borderRadius:10, border:`2px solid ${isDenied?'#EF4444':'#E2E8F0'}`, background: isDenied?'#FEF2F2':'#fff', color: isDenied?'#B91C1C':'#64748B', fontWeight:700, fontSize:13, cursor:'pointer', transition:'all 0.2s' }}>
                <ThumbsDown size={14}/> {isDenied?'Declined':'Keep original'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── FINAL DOCUMENT ────────────────────────────────────────────────────────────
function buildFinalDocument(data, decisions, chatRevisions) {
  const L = [];
  L.push(`CONTRACT REVIEW — ${data.document_name.toUpperCase()}`);
  L.push('='.repeat(60));
  L.push(`Overall Risk: ${data.overall_risk}`);
  L.push(`Review Date: ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}`);
  L.push(''); L.push('EXECUTIVE SUMMARY'); L.push('-'.repeat(40)); L.push(data.summary);
  L.push(''); L.push('CRITICAL FLAGS'); L.push('-'.repeat(40));
  data.top_red_flags.forEach((f,i) => L.push(`${i+1}. ${f}`));
  L.push(''); L.push('CLAUSE REVIEW — FINAL VERSIONS'); L.push('='.repeat(60));
  data.clauses.forEach((clause, i) => {
    const dec = decisions[i], rev = chatRevisions[i];
    L.push(''); L.push(clause.clause_title.toUpperCase()); L.push('-'.repeat(40));
    let finalText = clause.original_text, statusLabel = '[ NO ALTERNATE SUGGESTED ]';
    if (rev)                                 { finalText = rev;                    statusLabel = '[ MODIFIED VIA AI CHAT ]'; }
    else if (dec==='approved'&&clause.alternate_clause) { finalText = clause.alternate_clause; statusLabel = '[ CHANGE APPROVED ]'; }
    else if (dec==='denied')                 {                                     statusLabel = '[ ORIGINAL RETAINED — CHANGE DECLINED ]'; }
    else if (!dec&&clause.alternate_clause)  {                                     statusLabel = '[ PENDING REVIEW — ORIGINAL SHOWN ]'; }
    L.push(`Status: ${statusLabel}`);
    L.push(`Risk Level: ${clause.risk_level}${dec==='approved'&&clause.risk_after_fix ? ' → '+clause.risk_after_fix+' (after fix)' : ''}`);
    L.push(''); L.push('CONTRACT TEXT:'); L.push(finalText); L.push('');
  });
  L.push('='.repeat(60));
  L.push('Generated by LexiSafe AI — For review purposes only. Not legal advice.');
  return L.join('\n');
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [file,             setFile]             = useState(null);
  const [loading,          setLoading]          = useState(false);
  const [data,             setData]             = useState(null);
  const [guardrailErrors,  setGuardrailErrors]  = useState([]);
  const [pageReady,        setPageReady]        = useState(false);
  const [decisions,        setDecisions]        = useState({});
  const [chatRevisions,    setChatRevisions]    = useState({});
  const [chatHistories,    setChatHistories]    = useState({});
  const [showFinalDoc,     setShowFinalDoc]     = useState(false);
  const [finalDoc,         setFinalDoc]         = useState('');
  const [showPdf,          setShowPdf]          = useState(false);
  const [focusClauseIndex, setFocusClauseIndex] = useState(null);
  const finalDocRef = useRef(null);

  useEffect(() => { setPageReady(true); }, []);
  useEffect(() => { if (showFinalDoc) finalDocRef.current?.scrollIntoView({ behavior:'smooth' }); }, [showFinalDoc]);

  async function handleUpload() {
    if (!file) return;
    setLoading(true); setDecisions({}); setChatRevisions({}); setChatHistories({}); setShowFinalDoc(false);
    await new Promise(r => setTimeout(r, 1600));
    const raw       = mockBackendResponse(file.name); // ← swap for real API call
    const validated = validateResponse(raw);
    if (!validated || validated._errors) { setGuardrailErrors(validated?._errors || ['Unknown error']); setData(null); }
    else                                 { setGuardrailErrors([]); setData(validated); }
    setLoading(false);
  }

  function handleDecide(i, dec) { setDecisions(p => ({ ...p, [i]: p[i]===dec ? undefined : dec })); }
  function handleRequestChange(i, rev, hist) {
    if (rev)  setChatRevisions(p => ({ ...p, [i]: rev }));
    if (hist) setChatHistories(p => ({ ...p, [i]: hist }));
  }
  function handleViewInPdf(i) { setFocusClauseIndex(i); setShowPdf(true); }

  const totalAlternates = data ? data.clauses.filter(c => c.alternate_clause).length : 0;
  const reviewedCount   = Object.keys(decisions).length + Object.keys(chatRevisions).length;
  const allReviewed     = totalAlternates > 0 && reviewedCount >= totalAlternates;
  const approvedCount   = Object.values(decisions).filter(d => d==='approved').length;
  const chatModCount    = Object.values(chatRevisions).filter(Boolean).length;

  function generateFinalDoc() { setFinalDoc(buildFinalDocument(data, decisions, chatRevisions)); setShowFinalDoc(true); }
  function downloadDoc() {
    const blob = new Blob([finalDoc], { type:'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = `${data.document_name.replace(/\.[^.]+$/,'')}_reviewed.txt`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#F8FAFC 0%,#fff 50%,#F8FAFC 100%)', fontFamily:'system-ui,-apple-system,sans-serif', color:'#0F172A', overflowX:'hidden' }}>

      {/* PDF Viewer fullscreen overlay */}
      {showPdf && file && data && (
        <PdfViewer
          file={file}
          clauses={data.clauses}
          focusClauseIndex={focusClauseIndex}
          onClose={() => { setShowPdf(false); setFocusClauseIndex(null); }}
        />
      )}

      {/* NAVBAR */}
      <nav style={{ position:'sticky', top:0, zIndex:50, background:'rgba(255,255,255,0.88)', backdropFilter:'blur(16px)', borderBottom:'1px solid #F1F5F9' }}>
        <div style={{ maxWidth:1000, margin:'0 auto', padding:'0 22px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ background:'linear-gradient(135deg,#2563EB,#1D4ED8)', borderRadius:10, padding:7, display:'flex' }}>
              <ShieldAlert color="#fff" size={18}/>
            </div>
            <span style={{ fontSize:19, fontWeight:800, letterSpacing:'-0.5px' }}>LexiSafe<span style={{ color:'#2563EB' }}>AI</span></span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            {data && file && (
              <button onClick={() => setShowPdf(true)}
                style={{ display:'flex', alignItems:'center', gap:6, background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'6px 13px', fontWeight:700, fontSize:13, color:'#1D4ED8', cursor:'pointer' }}>
                <Layers size={14}/> View PDF
              </button>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:'#64748B', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:20, padding:'5px 12px' }}>
              <span style={{ width:7, height:7, background:'#22C55E', borderRadius:'50%', display:'inline-block', animation:'pulse 2s infinite' }}/>
              SECURE
            </div>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth:860, margin:'0 auto', padding:'42px 22px' }}>

        {/* Guardrail error banner */}
        {guardrailErrors.length > 0 && (
          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:11, padding:'11px 15px', marginBottom:18, display:'flex', gap:8 }}>
            <AlertTriangle size={16} color="#DC2626" style={{ flexShrink:0, marginTop:1 }}/>
            <div>
              <p style={{ fontWeight:700, color:'#991B1B', margin:'0 0 3px', fontSize:13 }}>Backend response failed validation</p>
              {guardrailErrors.map((e,i) => <p key={i} style={{ fontSize:12, color:'#B91C1C', margin:0 }}>{e}</p>)}
            </div>
          </div>
        )}

        {/* ── UPLOAD ── */}
        {!data && !loading && (
          <div style={{ opacity:pageReady?1:0, transform:pageReady?'none':'translateY(20px)', transition:'all 0.7s' }}>
            <div style={{ textAlign:'center', marginBottom:34 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:20, padding:'5px 13px', fontSize:12, fontWeight:700, color:'#1D4ED8', marginBottom:16 }}>
                <Zap size={13} fill="#2563EB"/> Powered by OpenAI
              </span>
              <h1 style={{ fontSize:50, fontWeight:900, letterSpacing:'-2px', lineHeight:1.05, margin:'0 0 13px' }}>
                Read contracts{' '}
                <span style={{ background:'linear-gradient(135deg,#2563EB,#1D4ED8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>smarter</span>
              </h1>
              <p style={{ fontSize:16, color:'#64748B', maxWidth:500, margin:'0 auto', lineHeight:1.6 }}>
                Uncover hidden risks, see clause highlights directly in your PDF, review every change, and export.
              </p>
            </div>

            <div style={{ background:'#fff', border:'1.5px dashed #CBD5E1', borderRadius:22, padding:44, textAlign:'center', boxShadow:'0 4px 32px rgba(0,0,0,0.06)' }}>
              <div style={{ width:68, height:68, background:'#EFF6FF', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <Upload size={30} color="#2563EB" strokeWidth={1.5}/>
              </div>
              <h2 style={{ fontSize:21, fontWeight:800, margin:'0 0 6px' }}>Upload your document</h2>
              <p style={{ color:'#94A3B8', fontSize:13, fontWeight:500, margin:'0 0 22px' }}>PDF, DOCX · Up to 50MB</p>
              <input type="file" id="pdf-upload" style={{ display:'none' }} onChange={e => setFile(e.target.files[0])} accept=".pdf,.docx"/>
              {!file ? (
                <label htmlFor="pdf-upload" style={{ display:'inline-flex', alignItems:'center', gap:7, background:'#2563EB', color:'#fff', borderRadius:11, padding:'10px 24px', fontWeight:700, fontSize:14, cursor:'pointer' }}>
                  <Upload size={15}/> Choose File
                </label>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:9, padding:'8px 14px' }}>
                    <FileText size={15} color="#15803D"/>
                    <span style={{ fontWeight:700, color:'#15803D', fontSize:13 }}>{file.name}</span>
                    <button onClick={() => setFile(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:0 }}><X size={14}/></button>
                  </div>
                  <button onClick={handleUpload} style={{ display:'flex', alignItems:'center', gap:7, background:'#2563EB', color:'#fff', borderRadius:11, padding:'10px 26px', fontWeight:700, fontSize:14, border:'none', cursor:'pointer' }}>
                    Analyse Contract <ArrowRight size={15}/>
                  </button>
                </div>
              )}
            </div>

            <div style={{ display:'flex', justifyContent:'center', gap:9, marginTop:22, flexWrap:'wrap' }}>
              {['AI clause analysis','Alternate suggestions','Risk delta tracking','Legal citations','PDF clause highlights','Review & approve','Export final doc'].map(f => (
                <span key={f} style={{ fontSize:11, fontWeight:600, color:'#475569', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:20, padding:'4px 11px' }}>{f}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── LOADING ── */}
        {loading && (
          <div style={{ textAlign:'center', padding:'80px 0' }}>
            <div style={{ width:52, height:52, border:'4px solid #BFDBFE', borderTopColor:'#2563EB', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
            <p style={{ fontWeight:700, fontSize:16, color:'#1E3A5F' }}>Analysing your contract…</p>
            <p style={{ color:'#94A3B8', fontSize:13 }}>Reading clauses, assessing risk, preparing suggestions</p>
          </div>
        )}

        {/* ── RESULTS ── */}
        {data && !loading && (
          <div style={{ display:'flex', flexDirection:'column', gap:22 }}>

            {/* Title bar */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
              <div>
                <h2 style={{ fontWeight:800, fontSize:20, margin:'0 0 3px', display:'flex', alignItems:'center', gap:8 }}>
                  <FileText size={18} color="#2563EB"/> {data.document_name}
                </h2>
                <p style={{ fontSize:12, color:'#94A3B8', margin:0 }}>Expand each clause · view in PDF · approve or decline changes</p>
              </div>
              <div style={{ display:'flex', gap:7 }}>
                <button onClick={() => setShowPdf(true)}
                  style={{ display:'flex', alignItems:'center', gap:6, background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'6px 13px', fontWeight:700, fontSize:13, color:'#1D4ED8', cursor:'pointer' }}>
                  <Layers size={13}/> PDF Viewer
                </button>
                <button onClick={() => { setData(null); setFile(null); setShowFinalDoc(false); }}
                  style={{ display:'flex', alignItems:'center', gap:5, background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:10, padding:'6px 13px', fontWeight:600, fontSize:13, cursor:'pointer', color:'#475569' }}>
                  <RefreshCw size={12}/> New document
                </button>
              </div>
            </div>

            {/* Overview cards */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:11 }}>
              {[
                { label:'Overall Risk',     value:data.overall_risk,                     color:riskColor(data.overall_risk).badgeText, bg:riskColor(data.overall_risk).badge },
                { label:'Clauses reviewed', value:`${reviewedCount} / ${totalAlternates}`, color:'#1D4ED8', bg:'#EFF6FF' },
                { label:'Changes approved', value:`${approvedCount+chatModCount}`,          color:'#15803D', bg:'#F0FDF4' },
              ].map(c => (
                <div key={c.label} style={{ background:c.bg, borderRadius:13, padding:'13px 16px', textAlign:'center' }}>
                  <p style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:1, margin:'0 0 5px' }}>{c.label}</p>
                  <p style={{ fontSize:23, fontWeight:900, color:c.color, margin:0 }}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div style={{ background:'#F8FAFC', borderRadius:13, padding:'16px 20px', border:'1px solid #E2E8F0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
                <Eye size={14} color="#2563EB"/>
                <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#64748B' }}>Executive Summary</span>
              </div>
              <p style={{ fontSize:14, lineHeight:1.7, color:'#334155', margin:0 }}>{data.summary}</p>
            </div>

            {/* Red flags */}
            <div style={{ background:'#FFF7F7', border:'1px solid #FECACA', borderRadius:13, padding:'16px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:11 }}>
                <AlertTriangle size={14} color="#DC2626"/>
                <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color:'#DC2626' }}>Critical Red Flags</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {data.top_red_flags.map((flag, i) => (
                  <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                    <span style={{ background:'#DC2626', color:'#fff', borderRadius:5, width:19, height:19, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, flexShrink:0, marginTop:1 }}>!</span>
                    <p style={{ fontSize:13, fontWeight:600, color:'#7F1D1D', margin:0, lineHeight:1.5 }}>{flag}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Clause review section */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:11 }}>
                <CheckSquare size={16} color="#2563EB"/>
                <h3 style={{ fontWeight:800, fontSize:18, margin:0 }}>Clause-by-Clause Review</h3>
              </div>

              {/* PDF highlight legend / quick open */}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12, padding:'8px 13px', background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0', flexWrap:'wrap' }}>
                <span style={{ fontSize:12, color:'#64748B', fontWeight:600 }}>PDF highlights:</span>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:13, height:13, background:'rgba(239,68,68,0.25)', border:'2px solid #EF4444', borderRadius:3, display:'inline-block' }}/>
                  <span style={{ fontSize:12, color:'#64748B' }}>High risk</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:13, height:13, background:'rgba(234,179,8,0.25)', border:'2px solid #EAB308', borderRadius:3, display:'inline-block' }}/>
                  <span style={{ fontSize:12, color:'#64748B' }}>Medium risk</span>
                </div>
                <span style={{ fontSize:12, color:'#94A3B8' }}>— use "View in PDF" on each card to jump directly to that clause</span>
                <button onClick={() => setShowPdf(true)}
                  style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, background:'#2563EB', color:'#fff', border:'none', borderRadius:8, padding:'5px 12px', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                  <Layers size={13}/> Open PDF viewer
                </button>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
                {data.clauses.map((clause, i) => (
                  <ClauseReviewCard
                    key={i}
                    clause={chatRevisions[i] ? { ...clause, alternate_clause: chatRevisions[i] } : clause}
                    index={i}
                    decision={decisions[i]}
                    onDecide={handleDecide}
                    onRequestChange={handleRequestChange}
                    chatHistory={chatHistories[i] || []}
                    onViewInPdf={handleViewInPdf}
                  />
                ))}
              </div>
            </div>

            {/* Finalise bar */}
            <div style={{ background:allReviewed?'#F0FDF4':'#F8FAFC', border:`1.5px solid ${allReviewed?'#86EFAC':'#E2E8F0'}`, borderRadius:13, padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:11 }}>
              <div>
                <p style={{ fontWeight:700, fontSize:15, margin:'0 0 3px', color:allReviewed?'#15803D':'#334155' }}>
                  {allReviewed ? '✓ All clauses reviewed — ready to finalise' : `${totalAlternates-reviewedCount} remaining clause${totalAlternates-reviewedCount!==1?'s':''} to review`}
                </p>
                <p style={{ fontSize:12, color:'#64748B', margin:0 }}>
                  {approvedCount} approved · {chatModCount} AI-modified · {Object.values(decisions).filter(d=>d==='denied').length} declined
                </p>
              </div>
              <button onClick={generateFinalDoc} disabled={totalAlternates>0&&!allReviewed}
                style={{ display:'flex', alignItems:'center', gap:7, background:allReviewed||totalAlternates===0?'#2563EB':'#CBD5E1', color:'#fff', border:'none', borderRadius:11, padding:'10px 24px', fontWeight:700, fontSize:13, cursor:allReviewed||totalAlternates===0?'pointer':'not-allowed', transition:'background 0.2s' }}>
                <Download size={14}/> Generate Final Document
              </button>
            </div>

            {/* Final doc panel */}
            {showFinalDoc && (
              <div ref={finalDocRef} style={{ border:'2px solid #2563EB', borderRadius:13, overflow:'hidden', boxShadow:'0 8px 32px rgba(37,99,235,0.12)' }}>
                <div style={{ background:'#2563EB', padding:'11px 17px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <FileText size={15} color="#fff"/>
                    <span style={{ fontWeight:700, color:'#fff', fontSize:14 }}>Final Document — {data.document_name.replace(/\.[^.]+$/,'')}_reviewed.txt</span>
                  </div>
                  <div style={{ display:'flex', gap:7 }}>
                    <button onClick={downloadDoc} style={{ display:'flex', alignItems:'center', gap:5, background:'#fff', color:'#2563EB', border:'none', borderRadius:7, padding:'5px 13px', fontWeight:700, fontSize:12, cursor:'pointer' }}><Download size={12}/> Download</button>
                    <button onClick={() => setShowFinalDoc(false)} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', borderRadius:7, padding:'5px 8px', cursor:'pointer' }}><X size={14}/></button>
                  </div>
                </div>
                <div style={{ background:'#0F172A', padding:18, maxHeight:460, overflowY:'auto' }}>
                  <pre style={{ fontFamily:'"Fira Code","Courier New",monospace', fontSize:12, lineHeight:1.7, color:'#E2E8F0', margin:0, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                    {finalDoc.split('\n').map((line, i) => {
                      let color = '#E2E8F0';
                      if (line.startsWith('='))                           color = '#475569';
                      else if (line.startsWith('-'))                       color = '#334155';
                      else if (line.includes('[ CHANGE APPROVED ]'))       color = '#4ADE80';
                      else if (line.includes('[ ORIGINAL RETAINED'))       color = '#F87171';
                      else if (line.includes('[ MODIFIED VIA AI CHAT ]'))  color = '#C084FC';
                      else if (line.includes('[ PENDING'))                 color = '#FCD34D';
                      else if (line.startsWith('Status:')||line.startsWith('Risk Level:')) color = '#93C5FD';
                      else if (line===line.toUpperCase()&&line.trim().length>3&&!line.startsWith(' ')) color = '#F8FAFC';
                      return <span key={i} style={{ color, display:'block' }}>{line||'\u00A0'}</span>;
                    })}
                  </pre>
                </div>
                <div style={{ background:'#F8FAFC', padding:'10px 17px', borderTop:'1px solid #E2E8F0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, color:'#94A3B8' }}>⚠ For review purposes only. Not legal advice.</span>
                  <button onClick={downloadDoc} style={{ display:'flex', alignItems:'center', gap:5, background:'#2563EB', color:'#fff', border:'none', borderRadius:7, padding:'6px 15px', fontWeight:700, fontSize:12, cursor:'pointer' }}><Download size={12}/> Save .txt</button>
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      <footer style={{ marginTop:52, padding:'22px', borderTop:'1px solid #F1F5F9', textAlign:'center' }}>
        <p style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:'#94A3B8', textTransform:'uppercase', margin:'0 0 4px' }}>Enterprise Security</p>
        <p style={{ fontSize:12, color:'#CBD5E1', margin:0 }}>256-bit encryption · GDPR compliant · SOC 2 certified</p>
      </footer>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
