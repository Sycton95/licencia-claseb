// src/pages/AdminPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminTopStrip } from '../components/admin/AdminTopStrip';
import { DashboardView } from '../components/admin/DashboardView';
import { CatalogManager } from '../components/admin/CatalogManager';
import { EditorPanel } from '../components/admin/EditorPanel';
import { AiQueueManager } from '../components/admin/AiQueueManager';
import type { AdminHealth, AdminReportSummary, AdminSection } from '../components/admin/types';

import { buildDraftQuestionFromSuggestion } from '../lib/aiSuggestionEngine';
import { buildChapterCoverage, getQuestionWarnings } from '../lib/editorialDiagnostics';
import { validateQuestionAction } from '../lib/contentValidation';
import { isSupabaseConfigured, useLocalAdminMode } from '../lib/supabase';
import {
  getContentCatalog, getAiWorkspace, getCurrentSession, isCurrentUserAdmin, 
  saveQuestion, markAiSuggestionApplied, generateAiWorkspace, transitionAiSuggestion,
  requestAdminMagicLink, signOutAdmin
} from '../lib/contentRepository';

import type { AiSuggestion, AiSuggestionStatus, AiWorkspace } from '../types/ai';
import type { ContentCatalog, EditorialAction, EditorialStatus, Question } from '../types/content';

function cloneQuestion(question: Question) { return JSON.parse(JSON.stringify(question)) as Question; }

export function AdminPage() {
  const [catalog, setCatalog] = useState<ContentCatalog | null>(null);
  const [aiWorkspace, setAiWorkspace] = useState<AiWorkspace | null>(null);
  
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [draftQuestion, setDraftQuestion] = useState<Question | null>(null);
  const [draftOriginSuggestionId, setDraftOriginSuggestionId] = useState<string | null>(null);
  
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  
  const [filterStatus, setFilterStatus] = useState<'all' | EditorialStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loginEmail, setLoginEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [adminHealth, setAdminHealth] = useState<AdminHealth | null>(null);

  const canUseLocalAdmin = useLocalAdminMode;

  useEffect(() => {
    getContentCatalog().then(setCatalog).finally(() => setIsLoading(false));
    if (canUseLocalAdmin) {
      setIsAdminAuthorized(true);
      setSessionEmail('local-admin');
      return;
    }

    if (isSupabaseConfigured) {
      fetch('/api/health').then(async (res) => { if (res.ok) setAdminHealth(await res.json()); }).catch(() => {});
      Promise.all([getCurrentSession(), isCurrentUserAdmin().catch(() => false)])
        .then(([session, isAdmin]) => { setSessionEmail(session?.user.email ?? null); setIsAdminAuthorized(isAdmin); })
        .catch(() => { setSessionEmail(null); setIsAdminAuthorized(false); });
    } else {
      setIsAdminAuthorized(canUseLocalAdmin);
      setSessionEmail(canUseLocalAdmin ? 'local-admin' : null);
    }
  }, [canUseLocalAdmin]);

  useEffect(() => { if (canUseLocalAdmin || isAdminAuthorized) getAiWorkspace().then(setAiWorkspace); }, [canUseLocalAdmin, isAdminAuthorized]);

  const filteredQuestions = useMemo(() => {
    if (!catalog) return [];
    return catalog.questions.filter((q) => {
      if (filterStatus !== 'all' && q.status !== filterStatus) return false;
      if (searchTerm.trim() && !q.prompt.toLowerCase().includes(searchTerm.toLowerCase()) && !q.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [catalog, filterStatus, searchTerm]);

  const summary = useMemo<AdminReportSummary | null>(() => {
    if (!catalog) return null;
    return {
      totalQuestions: catalog.questions.length, draftCount: catalog.questions.filter((q) => q.status === 'draft').length,
      reviewedCount: catalog.questions.filter((q) => q.status === 'reviewed').length, publishedCount: catalog.questions.filter((q) => q.status === 'published').length,
      archivedCount: catalog.questions.filter((q) => q.status === 'archived').length, examEligibleCount: catalog.questions.filter((q) => q.isOfficialExamEligible).length,
    };
  }, [catalog]);

  const chapterCoverage = useMemo(() => catalog ? buildChapterCoverage(catalog.chapters, catalog.questions) : [], [catalog]);

  const selectQuestion = (id: string | null) => {
    if (!id) { setSelectedQuestionId(null); setDraftQuestion(null); return; }
    const q = catalog?.questions.find((item) => item.id === id);
    if (q) { setSelectedQuestionId(id); setDraftQuestion(cloneQuestion(q)); setDraftOriginSuggestionId(null); }
  };

  const handleEditorialAction = async (action: EditorialAction, msg: string) => {
    if (!draftQuestion) return;
    setIsBusy(true);
    const qToSave = { ...draftQuestion, updatedBy: sessionEmail ?? 'local-admin', status: action === 'save_draft' ? 'draft' : action === 'mark_reviewed' ? 'reviewed' : action === 'publish' ? 'published' : action === 'archive' ? 'archived' : draftQuestion.status };
    const errs = validateQuestionAction(qToSave, action);
    if (errs.length > 0) { alert(errs.join('\n')); setIsBusy(false); return; }

    try {
      await saveQuestion(qToSave, action);
      const updatedCatalog = await getContentCatalog();
      setCatalog(updatedCatalog);
      if (draftOriginSuggestionId) { setAiWorkspace(await markAiSuggestionApplied(draftOriginSuggestionId, qToSave.id)); setDraftOriginSuggestionId(null); }
      setDraftQuestion(cloneQuestion(qToSave));
    } catch (e) { alert('Error al guardar.'); } finally { setIsBusy(false); }
  };

  const handleLoadSuggestionIntoEditor = async (s: AiSuggestion) => {
    const qDraft = buildDraftQuestionFromSuggestion(s, sessionEmail ?? 'local-admin');
    if (!qDraft) return;
    setSelectedQuestionId(s.targetQuestionId ?? 'new-draft');
    setDraftQuestion(qDraft);
    setDraftOriginSuggestionId(s.id);
    setActiveSection('catalog');
    if (s.status === 'pending') setAiWorkspace(await transitionAiSuggestion(s.id, 'accepted'));
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-medium text-sm">Cargando Admin Workspace...</div>;

  if (!canUseLocalAdmin && isSupabaseConfigured && !sessionEmail) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Acceso Editorial</h1>
          <p className="text-sm text-slate-500 mb-6">Ingresa con tu correo autorizado para acceder al panel.</p>
          <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="correo@dominio.com" className="w-full p-3 mb-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          <button onClick={() => requestAdminMagicLink(loginEmail)} className="w-full px-4 py-3 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors">Enviar enlace mágico</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <AdminSidebar activeSection={activeSection} onNavigate={setActiveSection} sessionEmail={sessionEmail} onSignOut={signOutAdmin} isSupabaseConfigured={isSupabaseConfigured} isMobileOpen={isMobileMenuOpen} onCloseMobile={() => setIsMobileMenuOpen(false)} />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
        <AdminTopStrip activeSection={activeSection} onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        
        <div className="flex-1 overflow-hidden relative w-full">
          {activeSection === 'dashboard' && <DashboardView summary={summary} chapterCoverage={chapterCoverage} health={adminHealth} />}
          {activeSection === 'catalog' && (
            <CatalogManager 
              questions={filteredQuestions} selectedQuestionId={selectedQuestionId} onSelectQuestion={selectQuestion}
              searchTerm={searchTerm} onSearchTermChange={setSearchTerm} filterStatus={filterStatus} setFilterStatus={setFilterStatus}
              editorPanel={<EditorPanel draftQuestion={draftQuestion} isBusy={isBusy} onAction={handleEditorialAction} onClose={() => selectQuestion(null)}
                onUpdateField={(f, v) => setDraftQuestion(prev => prev ? { ...prev, [f]: v } : prev)}
                onUpdateOptionText={(id, txt) => setDraftQuestion(prev => prev ? { ...prev, options: prev.options.map(o => o.id === id ? { ...o, text: txt } : o) } : prev)}
                onUpdateOptionCorrect={(id, chk) => setDraftQuestion(prev => prev ? { ...prev, options: prev.options.map(o => o.id === id ? { ...o, isCorrect: chk } : (prev.selectionMode === 'single' ? { ...o, isCorrect: false } : o)) } : prev)}
                chapters={catalog?.chapters || []} sourceDocuments={catalog?.sourceDocuments || []} />}
            />
          )}
          {activeSection === 'ai' && (
            <AiQueueManager 
              filteredSuggestions={aiWorkspace?.suggestions || []} isBusy={isBusy} selectedSuggestionId={selectedSuggestionId} selectedSuggestion={aiWorkspace?.suggestions.find(s => s.id === selectedSuggestionId) || null}
              onSelectSuggestion={setSelectedSuggestionId} onLoadSuggestionIntoEditor={handleLoadSuggestionIntoEditor} onGenerateSuggestions={async () => setAiWorkspace(await generateAiWorkspace())}
              onTransitionSuggestion={async (id, status) => setAiWorkspace(await transitionAiSuggestion(id, status))}
            />
          )}
        </div>
      </main>
    </div>
  );
}
