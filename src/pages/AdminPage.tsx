import { useEffect, useMemo, useState } from 'react';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminTopStrip } from '../components/admin/AdminTopStrip';
import { DashboardView } from '../components/admin/DashboardView';
import { CatalogManager } from '../components/admin/CatalogManager';
import { EditorPanel } from '../components/admin/EditorPanel';
import { AiQueueManager } from '../components/admin/AiQueueManager';
import { BetaPilotManager } from '../components/admin/BetaPilotManager';
import type { AdminHealth, AdminReportSummary, AdminSection } from '../components/admin/types';
import { buildDraftQuestionFromSuggestion } from '../lib/aiSuggestionEngine';
import {
  buildChapterCoverage,
  buildQuestionDiagnosticMap,
  buildReviewSummary,
  buildReviewTasks,
  buildSuggestionDiagnosticMap,
  getQuestionDiagnostics,
} from '../lib/editorialDiagnostics';
import { validateQuestionAction } from '../lib/contentValidation';
import {
  isAdminBetaPanelEnabled,
  isLocalOllamaEnabled,
  isSupabaseConfigured,
  ollamaMaxGenerationMs,
  ollamaMaxItemsPerRun,
  ollamaModel,
  useLocalAdminMode,
} from '../lib/supabase';
import {
  discardLocalAiPilotSuggestion,
  generateAiWorkspace,
  generateLocalAiPilotWorkspace,
  getAiWorkspace,
  getContentCatalog,
  getCurrentSession,
  getLocalAiPilotWorkspace,
  isCurrentUserAdmin,
  markAiSuggestionApplied,
  requestAdminMagicLink,
  saveQuestion,
  signOutAdmin,
  transitionAiSuggestion,
} from '../lib/contentRepository';
import type {
  AiPilotRunMode,
  AiPilotSuggestionRecord,
  AiPilotWorkspace,
  AiSuggestion,
  AiWorkspace,
} from '../types/ai';
import type { ContentCatalog, EditorialAction, EditorialStatus, Question } from '../types/content';

type StatusTone = 'success' | 'error';

function cloneQuestion(question: Question) {
  return JSON.parse(JSON.stringify(question)) as Question;
}

export function AdminPage() {
  const [catalog, setCatalog] = useState<ContentCatalog | null>(null);
  const [aiWorkspace, setAiWorkspace] = useState<AiWorkspace | null>(null);
  const [betaWorkspace, setBetaWorkspace] = useState<AiPilotWorkspace | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [draftQuestion, setDraftQuestion] = useState<Question | null>(null);
  const [draftOriginSuggestionId, setDraftOriginSuggestionId] = useState<string | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [selectedBetaSuggestionId, setSelectedBetaSuggestionId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | EditorialStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [adminHealth, setAdminHealth] = useState<AdminHealth | null>(null);
  const [editorStatusMessage, setEditorStatusMessage] = useState<string | null>(null);
  const [editorStatusTone, setEditorStatusTone] = useState<StatusTone>('success');

  const canUseLocalAdmin = useLocalAdminMode;
  const showBetaSection = isAdminBetaPanelEnabled && (canUseLocalAdmin || isAdminAuthorized);

  useEffect(() => {
    getContentCatalog().then(setCatalog).finally(() => setIsLoading(false));

    if (canUseLocalAdmin) {
      setIsAdminAuthorized(true);
      setSessionEmail('local-admin');
      return;
    }

    if (isSupabaseConfigured) {
      fetch('/api/health')
        .then(async (response) => {
          if (response.ok) {
            setAdminHealth(await response.json());
          }
        })
        .catch(() => {});

      Promise.all([getCurrentSession(), isCurrentUserAdmin().catch(() => false)])
        .then(([session, isAdmin]) => {
          setSessionEmail(session?.user.email ?? null);
          setIsAdminAuthorized(isAdmin);
        })
        .catch(() => {
          setSessionEmail(null);
          setIsAdminAuthorized(false);
        });
    } else {
      setIsAdminAuthorized(canUseLocalAdmin);
      setSessionEmail(canUseLocalAdmin ? 'local-admin' : null);
    }
  }, [canUseLocalAdmin]);

  useEffect(() => {
    if (canUseLocalAdmin || isAdminAuthorized) {
      getAiWorkspace().then(setAiWorkspace);
    }
  }, [canUseLocalAdmin, isAdminAuthorized]);

  useEffect(() => {
    if (showBetaSection) {
      getLocalAiPilotWorkspace().then(setBetaWorkspace);
    }
  }, [showBetaSection]);

  const filteredQuestions = useMemo(() => {
    if (!catalog) {
      return [];
    }

    return catalog.questions.filter((question) => {
      if (filterStatus !== 'all' && question.status !== filterStatus) {
        return false;
      }

      if (
        searchTerm.trim() &&
        !question.prompt.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !question.id.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [catalog, filterStatus, searchTerm]);

  const reviewTasks = useMemo(() => {
    if (!catalog) {
      return [];
    }

    return buildReviewTasks(catalog.questions).sort((left, right) => {
      if (left.severity !== right.severity) {
        return left.severity === 'critical' ? -1 : 1;
      }

      return left.questionId.localeCompare(right.questionId);
    });
  }, [catalog]);

  const questionDiagnosticsById = useMemo(
    () => (catalog ? buildQuestionDiagnosticMap(catalog.questions) : {}),
    [catalog],
  );

  const suggestionDiagnosticsById = useMemo(
    () =>
      catalog && aiWorkspace
        ? buildSuggestionDiagnosticMap(aiWorkspace.suggestions, catalog.questions)
        : {},
    [aiWorkspace, catalog],
  );

  const draftDiagnostics = useMemo(() => {
    if (!draftQuestion || !catalog) {
      return [];
    }

    const peerQuestions = catalog.questions.filter((question) => question.id !== draftQuestion.id);
    return getQuestionDiagnostics(draftQuestion, [draftQuestion, ...peerQuestions]);
  }, [catalog, draftQuestion]);

  const summary = useMemo<AdminReportSummary | null>(() => {
    if (!catalog) {
      return null;
    }

    return {
      totalQuestions: catalog.questions.length,
      draftCount: catalog.questions.filter((question) => question.status === 'draft').length,
      reviewedCount: catalog.questions.filter((question) => question.status === 'reviewed').length,
      publishedCount: catalog.questions.filter((question) => question.status === 'published').length,
      archivedCount: catalog.questions.filter((question) => question.status === 'archived').length,
      examEligibleCount: catalog.questions.filter((question) => question.isOfficialExamEligible)
        .length,
      reviewSummary: buildReviewSummary(reviewTasks),
    };
  }, [catalog, reviewTasks]);

  const chapterCoverage = useMemo(
    () => (catalog ? buildChapterCoverage(catalog.chapters, catalog.questions) : []),
    [catalog],
  );

  const setEditorStatus = (message: string | null, tone: StatusTone = 'success') => {
    setEditorStatusMessage(message);
    setEditorStatusTone(tone);
  };

  const selectQuestion = (id: string | null) => {
    if (!id) {
      setSelectedQuestionId(null);
      setDraftQuestion(null);
      setEditorStatus(null);
      return;
    }

    const question = catalog?.questions.find((item) => item.id === id);
    if (question) {
      setSelectedQuestionId(id);
      setDraftQuestion(cloneQuestion(question));
      setDraftOriginSuggestionId(null);
      setEditorStatus(null);
    }
  };

  const handleEditorialAction = async (action: EditorialAction, message: string) => {
    if (!draftQuestion) {
      return;
    }

    setIsBusy(true);

    const questionToSave = {
      ...draftQuestion,
      updatedBy: sessionEmail ?? 'local-admin',
      status:
        action === 'save_draft'
          ? 'draft'
          : action === 'mark_reviewed'
            ? 'reviewed'
            : action === 'publish'
              ? 'published'
              : action === 'archive'
                ? 'archived'
                : draftQuestion.status,
    };

    const validationErrors = validateQuestionAction(questionToSave, action);
    if (validationErrors.length > 0) {
      setEditorStatus(validationErrors.join(' '), 'error');
      setIsBusy(false);
      return;
    }

    try {
      await saveQuestion(questionToSave, action);
      const updatedCatalog = await getContentCatalog();
      setCatalog(updatedCatalog);

      if (draftOriginSuggestionId) {
        setAiWorkspace(await markAiSuggestionApplied(draftOriginSuggestionId, questionToSave.id));
        setDraftOriginSuggestionId(null);
      }

      setDraftQuestion(cloneQuestion(questionToSave));
      setEditorStatus(message, 'success');
    } catch {
      setEditorStatus('No se pudo guardar. Revisa la conexion e intentalo nuevamente.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleLoadSuggestionIntoEditor = async (suggestion: AiSuggestion) => {
    const questionDraft = buildDraftQuestionFromSuggestion(
      suggestion,
      sessionEmail ?? 'local-admin',
    );
    if (!questionDraft) {
      return;
    }

    setSelectedQuestionId(suggestion.targetQuestionId ?? 'new-draft');
    setDraftQuestion(questionDraft);
    setDraftOriginSuggestionId(suggestion.id);
    setActiveSection('catalog');
    setEditorStatus('Borrador cargado desde sugerencia AI.', 'success');

    if (suggestion.status === 'pending') {
      setAiWorkspace(await transitionAiSuggestion(suggestion.id, 'accepted'));
    }
  };

  const handleLoadBetaSuggestionIntoEditor = (record: AiPilotSuggestionRecord) => {
    const questionDraft = buildDraftQuestionFromSuggestion(
      record.suggestion,
      sessionEmail ?? 'local-admin',
    );

    if (!questionDraft) {
      setEditorStatus('La salida Beta no se pudo convertir en draft utilizable.', 'error');
      return;
    }

    setSelectedQuestionId(record.suggestion.targetQuestionId ?? `beta-${record.suggestion.id}`);
    setDraftQuestion(questionDraft);
    setDraftOriginSuggestionId(null);
    setActiveSection('catalog');
    setEditorStatus('Borrador cargado desde Beta local.', 'success');
  };

  const handleRunBetaPilot = async (mode: AiPilotRunMode) => {
    setIsBusy(true);

    try {
      setBetaWorkspace(await generateLocalAiPilotWorkspace('ollama_qwen25_3b', mode));
      setSelectedBetaSuggestionId(null);
      setEditorStatus(`Corrida Beta ejecutada en modo ${mode}.`, 'success');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo ejecutar el piloto local de Ollama.';
      setEditorStatus(message, 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDiscardBetaSuggestion = async (id: string) => {
    setBetaWorkspace(await discardLocalAiPilotSuggestion(id));
    setSelectedBetaSuggestionId((current) => (current === id ? null : current));
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Cargando Admin Workspace...
      </div>
    );
  }

  if (!canUseLocalAdmin && isSupabaseConfigured && !sessionEmail) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="mb-2 text-xl font-bold text-slate-900">Acceso editorial</h1>
          <p className="mb-6 text-sm text-slate-500">
            Ingresa con tu correo autorizado para acceder al panel.
          </p>

          <label className="mb-2 block text-left text-xs font-bold uppercase tracking-wide text-slate-500">
            Correo autorizado
          </label>
          <input
            type="email"
            name="admin-email"
            autoComplete="email"
            aria-label="Correo autorizado"
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            placeholder="correo@dominio.com..."
            className="mb-4 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => requestAdminMagicLink(loginEmail)}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300"
          >
            Enviar enlace magico
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-slate-50 font-sans text-slate-900">
      <AdminSidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        sessionEmail={sessionEmail}
        onSignOut={signOutAdmin}
        isSupabaseConfigured={isSupabaseConfigured}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        showBeta={showBetaSection}
      />

      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-y-auto md:overflow-hidden landscape:md:overflow-hidden">
        <AdminTopStrip
          activeSection={activeSection}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        <div className="relative w-full flex-1 overflow-y-auto md:overflow-hidden landscape:md:overflow-hidden">
          {activeSection === 'dashboard' && (
            <DashboardView
              summary={summary}
              chapterCoverage={chapterCoverage}
              health={adminHealth}
              reviewTasks={reviewTasks}
            />
          )}

          {activeSection === 'catalog' && (
            <CatalogManager
              questions={filteredQuestions}
              selectedQuestionId={selectedQuestionId}
              onSelectQuestion={selectQuestion}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              diagnosticsByQuestionId={questionDiagnosticsById}
              editorPanel={
                <EditorPanel
                  draftQuestion={draftQuestion}
                  diagnostics={draftDiagnostics}
                  isBusy={isBusy}
                  statusMessage={editorStatusMessage}
                  statusTone={editorStatusTone}
                  onAction={handleEditorialAction}
                  onClose={() => selectQuestion(null)}
                  onUpdateField={(field, value) =>
                    setDraftQuestion((previous) =>
                      previous ? { ...previous, [field]: value } : previous,
                    )
                  }
                  onUpdateOptionText={(id, text) =>
                    setDraftQuestion((previous) =>
                      previous
                        ? {
                            ...previous,
                            options: previous.options.map((option) =>
                              option.id === id ? { ...option, text } : option,
                            ),
                          }
                        : previous,
                    )
                  }
                  onUpdateOptionCorrect={(id, checked) =>
                    setDraftQuestion((previous) =>
                      previous
                        ? {
                            ...previous,
                            options: previous.options.map((option) =>
                              option.id === id
                                ? { ...option, isCorrect: checked }
                                : previous.selectionMode === 'single'
                                  ? { ...option, isCorrect: false }
                                  : option,
                            ),
                          }
                        : previous,
                    )
                  }
                  chapters={catalog?.chapters || []}
                  sourceDocuments={catalog?.sourceDocuments || []}
                />
              }
            />
          )}

          {activeSection === 'ai' && (
            <AiQueueManager
              filteredSuggestions={aiWorkspace?.suggestions || []}
              diagnosticsBySuggestionId={suggestionDiagnosticsById}
              isBusy={isBusy}
              selectedSuggestionId={selectedSuggestionId}
              selectedSuggestion={
                aiWorkspace?.suggestions.find((suggestion) => suggestion.id === selectedSuggestionId) ||
                null
              }
              onSelectSuggestion={setSelectedSuggestionId}
              onLoadSuggestionIntoEditor={handleLoadSuggestionIntoEditor}
              onGenerateSuggestions={async () => setAiWorkspace(await generateAiWorkspace())}
              onTransitionSuggestion={async (id, status) =>
                setAiWorkspace(await transitionAiSuggestion(id, status))
              }
            />
          )}

          {activeSection === 'beta' && showBetaSection && (
            <BetaPilotManager
              isBusy={isBusy}
              isEnabled={isLocalOllamaEnabled}
              maxItemsPerRun={ollamaMaxItemsPerRun}
              model={ollamaModel}
              providerId="ollama_qwen25_3b"
              selectedSuggestionId={selectedBetaSuggestionId}
              timeoutMs={ollamaMaxGenerationMs}
              workspace={betaWorkspace}
              onDiscardSuggestion={handleDiscardBetaSuggestion}
              onLoadIntoEditor={handleLoadBetaSuggestionIntoEditor}
              onRunPilot={handleRunBetaPilot}
              onSelectSuggestion={setSelectedBetaSuggestionId}
            />
          )}
        </div>
      </main>
    </div>
  );
}
