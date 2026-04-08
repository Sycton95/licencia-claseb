import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AiQueueManager } from '../components/admin/AiQueueManager';
import { CatalogManager } from '../components/admin/CatalogManager';
import { DashboardView } from '../components/admin/DashboardView';
import { EditorPanel } from '../components/admin/EditorPanel';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminTopStrip } from '../components/admin/AdminTopStrip';
import type { AdminHealth, AdminReportSummary, AdminSection } from '../components/admin/types';
import { buildDraftQuestionFromSuggestion } from '../lib/aiSuggestionEngine';
import {
  buildChapterCoverage,
  buildSourceCoverage,
  getQuestionWarnings,
  type EditorialWarning,
} from '../lib/editorialDiagnostics';
import {
  createDraftFromAiSuggestion,
  generateAiWorkspace,
  getAiWorkspace,
  getContentCatalog,
  getCurrentSession,
  isCurrentUserAdmin,
  markAiSuggestionApplied,
  requestAdminMagicLink,
  saveQuestion,
  seedRemoteContent,
  signOutAdmin,
  transitionAiSuggestion,
} from '../lib/contentRepository';
import { isSupabaseConfigured } from '../lib/supabase';
import { validateQuestionAction } from '../lib/contentValidation';
import type { AiSuggestion, AiSuggestionStatus, AiWorkspace } from '../types/ai';
import type {
  ContentCatalog,
  EditorialAction,
  EditorialStatus,
  Question,
} from '../types/content';

function getNowIsoString() {
  return new Date().toISOString();
}

function cloneQuestion(question: Question) {
  return JSON.parse(JSON.stringify(question)) as Question;
}

function prepareQuestionForAction(
  question: Question,
  editorLabel: string,
  action: EditorialAction,
): Question {
  const now = getNowIsoString();
  const draft = {
    ...question,
    updatedBy: editorLabel,
  };

  if (action === 'save_draft') {
    draft.status = 'draft';
    draft.publishedAt = undefined;
  }

  if (action === 'mark_reviewed') {
    draft.status = 'reviewed';
    draft.reviewedAt = draft.reviewedAt ?? now;
    draft.publishedAt = undefined;
  }

  if (action === 'publish') {
    draft.status = 'published';
    draft.reviewedAt = draft.reviewedAt ?? now;
    draft.publishedAt = now;
  }

  if (action === 'archive') {
    draft.status = 'archived';
  }

  if (action === 'save') {
    if (draft.status === 'reviewed' && !draft.reviewedAt) {
      draft.reviewedAt = now;
    }

    if (draft.status === 'published') {
      draft.reviewedAt = draft.reviewedAt ?? now;
      draft.publishedAt = draft.publishedAt ?? now;
    }
  }

  return draft;
}

export function AdminPage() {
  const [catalog, setCatalog] = useState<ContentCatalog | null>(null);
  const [aiWorkspace, setAiWorkspace] = useState<AiWorkspace | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [draftQuestion, setDraftQuestion] = useState<Question | null>(null);
  const [draftOriginSuggestionId, setDraftOriginSuggestionId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | EditorialStatus>('all');
  const [filterChapterId, setFilterChapterId] = useState<'all' | string>('all');
  const [filterSourceDocumentId, setFilterSourceDocumentId] = useState<'all' | string>('all');
  const [filterEligibleOnly, setFilterEligibleOnly] = useState(false);
  const [filterWarningsOnly, setFilterWarningsOnly] = useState(false);
  const [suggestionTypeFilter, setSuggestionTypeFilter] = useState<'all' | AiSuggestion['suggestionType']>('all');
  const [suggestionStatusFilter, setSuggestionStatusFilter] = useState<'all' | AiSuggestionStatus>('all');
  const [suggestionChapterFilter, setSuggestionChapterFilter] = useState<'all' | string>('all');
  const [suggestionSourceFilter, setSuggestionSourceFilter] = useState<'all' | string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [adminHealth, setAdminHealth] = useState<AdminHealth | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCatalogDetailOpen, setIsCatalogDetailOpen] = useState(false);
  const [isAiDetailOpen, setIsAiDetailOpen] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const canUseLocalAdmin =
    !isSupabaseConfigured &&
    (import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOCAL_ADMIN === 'true');

  const loadCatalog = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const contentCatalog = await getContentCatalog();
      setCatalog(contentCatalog);

      if (selectedQuestionId) {
        const matchingQuestion = contentCatalog.questions.find((question) => question.id === selectedQuestionId);

        if (matchingQuestion) {
          setDraftQuestion(cloneQuestion(matchingQuestion));
        } else {
          setSelectedQuestionId(null);
          setDraftQuestion(null);
          setDraftOriginSuggestionId(null);
          setIsCatalogDetailOpen(false);
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el panel admin.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAiData = async () => {
    try {
      const workspace = await getAiWorkspace();
      setAiWorkspace(workspace);

      if (
        selectedSuggestionId &&
        !workspace.suggestions.some((suggestion) => suggestion.id === selectedSuggestionId)
      ) {
        setSelectedSuggestionId(null);
        setIsAiDetailOpen(false);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la cola AI.');
    }
  };

  useEffect(() => {
    loadCatalog();

    if (isSupabaseConfigured) {
      fetch('/api/health', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('No se pudo leer el estado operativo.');
          }

          const payload = (await response.json()) as AdminHealth;
          setAdminHealth(payload);
        })
        .catch(() => {
          setAdminHealth(null);
        });
    }

    if (!isSupabaseConfigured) {
      setIsAdminAuthorized(canUseLocalAdmin);
      setSessionEmail(canUseLocalAdmin ? 'local-admin' : null);
      return;
    }

    Promise.all([getCurrentSession(), isCurrentUserAdmin().catch(() => false)])
      .then(([session, isAdmin]) => {
        setSessionEmail(session?.user.email ?? null);
        setIsAdminAuthorized(isAdmin);
      })
      .catch(() => {
        setSessionEmail(null);
        setIsAdminAuthorized(false);
      });
  }, []);

  useEffect(() => {
    if (canUseLocalAdmin || isAdminAuthorized) {
      loadAiData();
    }
  }, [canUseLocalAdmin, isAdminAuthorized]);

  const filteredQuestions = useMemo(() => {
    if (!catalog) {
      return [];
    }

    return catalog.questions.filter((question) => {
      if (filterStatus !== 'all' && question.status !== filterStatus) {
        return false;
      }

      if (filterChapterId !== 'all' && question.chapterId !== filterChapterId) {
        return false;
      }

      if (filterSourceDocumentId !== 'all' && question.sourceDocumentId !== filterSourceDocumentId) {
        return false;
      }

      if (filterEligibleOnly && !question.isOfficialExamEligible) {
        return false;
      }

      if (filterWarningsOnly && getQuestionWarnings(question).length === 0) {
        return false;
      }

      const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase();

      if (!normalizedSearchTerm) {
        return true;
      }

      return (
        question.prompt.toLowerCase().includes(normalizedSearchTerm) ||
        question.id.toLowerCase().includes(normalizedSearchTerm)
      );
    });
  }, [
    catalog,
    deferredSearchTerm,
    filterChapterId,
    filterEligibleOnly,
    filterSourceDocumentId,
    filterStatus,
    filterWarningsOnly,
  ]);

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
      examEligibleCount: catalog.questions.filter((question) => question.isOfficialExamEligible).length,
    };
  }, [catalog]);

  const chapterCoverage = useMemo(() => {
    if (!catalog) {
      return [];
    }

    return buildChapterCoverage(catalog.chapters, catalog.questions);
  }, [catalog]);

  const sourceCoverage = useMemo(() => {
    if (!catalog) {
      return [];
    }

    return buildSourceCoverage(catalog.sourceDocuments, catalog.questions);
  }, [catalog]);

  const warningsByQuestionId = useMemo(() => {
    if (!catalog) {
      return new Map<string, EditorialWarning[]>();
    }

    return new Map(
      catalog.questions.map((question) => [question.id, getQuestionWarnings(question)]),
    );
  }, [catalog]);

  const editorialWarnings = useMemo(() => {
    return Array.from(warningsByQuestionId.values()).flat();
  }, [warningsByQuestionId]);

  const filteredSuggestions = useMemo(() => {
    if (!aiWorkspace) {
      return [];
    }

    return aiWorkspace.suggestions.filter((suggestion) => {
      if (suggestionTypeFilter !== 'all' && suggestion.suggestionType !== suggestionTypeFilter) {
        return false;
      }

      if (suggestionStatusFilter !== 'all' && suggestion.status !== suggestionStatusFilter) {
        return false;
      }

      if (suggestionChapterFilter !== 'all' && suggestion.chapterId !== suggestionChapterFilter) {
        return false;
      }

      if (suggestionSourceFilter !== 'all' && suggestion.sourceDocumentId !== suggestionSourceFilter) {
        return false;
      }

      return true;
    });
  }, [
    aiWorkspace,
    suggestionChapterFilter,
    suggestionSourceFilter,
    suggestionStatusFilter,
    suggestionTypeFilter,
  ]);

  const selectedSuggestion = useMemo(() => {
    if (!aiWorkspace || !selectedSuggestionId) {
      return null;
    }

    return aiWorkspace.suggestions.find((suggestion) => suggestion.id === selectedSuggestionId) ?? null;
  }, [aiWorkspace, selectedSuggestionId]);

  const aiSummary = useMemo(() => {
    if (!aiWorkspace) {
      return null;
    }

    return {
      total: aiWorkspace.suggestions.length,
      pending: aiWorkspace.suggestions.filter((suggestion) => suggestion.status === 'pending').length,
      accepted: aiWorkspace.suggestions.filter((suggestion) => suggestion.status === 'accepted').length,
      applied: aiWorkspace.suggestions.filter((suggestion) => suggestion.status === 'applied').length,
      rejected: aiWorkspace.suggestions.filter((suggestion) => suggestion.status === 'rejected').length,
      deferred: aiWorkspace.suggestions.filter((suggestion) => suggestion.status === 'deferred').length,
      flags: aiWorkspace.suggestions.filter((suggestion) => suggestion.suggestionType === 'flag').length,
      coverageGaps: aiWorkspace.suggestions.filter((suggestion) => suggestion.suggestionType === 'coverage_gap').length,
    };
  }, [aiWorkspace]);

  const activeEdition = catalog?.activeEdition;
  const healthNeedsHardening =
    isSupabaseConfigured &&
    (!adminHealth || adminHealth.schema !== 'v1' || !adminHealth.usesServiceRole || !adminHealth.aiSchemaReady);

  const catalogChapterOptions = useMemo(
    () => catalog?.chapters.map((chapter) => ({ id: chapter.id, code: chapter.code })) ?? [],
    [catalog],
  );

  const catalogSourceOptions = useMemo(
    () =>
      catalog?.sourceDocuments.map((sourceDocument) => ({
        id: sourceDocument.id,
        title: sourceDocument.title,
      })) ?? [],
    [catalog],
  );

  const resetQuestionFilters = () => {
    setFilterStatus('all');
    setFilterChapterId('all');
    setFilterSourceDocumentId('all');
    setFilterEligibleOnly(false);
    setFilterWarningsOnly(false);
    setSearchTerm('');
  };

  const applyQuickFilter = (
    preset: 'all' | 'draft' | 'reviewed' | 'published' | 'archived' | 'exam' | 'warnings',
  ) => {
    resetQuestionFilters();

    if (
      preset === 'draft' ||
      preset === 'reviewed' ||
      preset === 'published' ||
      preset === 'archived'
    ) {
      setFilterStatus(preset);
    }

    if (preset === 'exam') {
      setFilterEligibleOnly(true);
    }

    if (preset === 'warnings') {
      setFilterWarningsOnly(true);
    }
  };

  const selectQuestion = (questionId: string) => {
    if (!catalog) {
      return;
    }

    const question = catalog.questions.find((item) => item.id === questionId);

    if (!question) {
      return;
    }

    setSelectedQuestionId(questionId);
    setDraftQuestion(cloneQuestion(question));
    setDraftOriginSuggestionId(null);
    setIsCatalogDetailOpen(true);
    setActiveSection('catalog');
    setMessage(null);
    setError(null);
  };

  const selectSuggestion = (suggestionId: string) => {
    setSelectedSuggestionId(suggestionId);
    setIsAiDetailOpen(true);
    setActiveSection('ai');
    setMessage(null);
    setError(null);
  };

  const handleQuestionField = <Key extends keyof Question>(field: Key, value: Question[Key]) => {
    setDraftQuestion((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleOptionText = (optionId: string, text: string) => {
    setDraftQuestion((current) =>
      current
        ? {
            ...current,
            options: current.options.map((option) =>
              option.id === optionId ? { ...option, text } : option,
            ),
          }
        : current,
    );
  };

  const handleOptionCorrect = (optionId: string, checked: boolean) => {
    setDraftQuestion((current) => {
      if (!current) {
        return current;
      }

      if (current.selectionMode === 'single' && checked) {
        return {
          ...current,
          options: current.options.map((option) => ({
            ...option,
            isCorrect: option.id === optionId,
          })),
        };
      }

      return {
        ...current,
        options: current.options.map((option) =>
          option.id === optionId ? { ...option, isCorrect: checked } : option,
        ),
      };
    });
  };

  const handleGenerateSuggestions = async () => {
    setIsBusy(true);
    setMessage(null);
    setError(null);

    try {
      const workspace = await generateAiWorkspace();
      setAiWorkspace(workspace);
      setMessage(`Se actualizaron ${workspace.runs[0]?.summary.generatedCount ?? workspace.suggestions.length} sugerencias AI para revisión.`);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'No se pudo generar la cola AI.',
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleSuggestionTransition = async (
    suggestionId: string,
    status: AiSuggestionStatus,
    successMessage: string,
  ) => {
    setIsBusy(true);
    setMessage(null);
    setError(null);

    try {
      const workspace = await transitionAiSuggestion(suggestionId, status);
      setAiWorkspace(workspace);
      setMessage(successMessage);
    } catch (transitionError) {
      setError(
        transitionError instanceof Error
          ? transitionError.message
          : 'No se pudo actualizar la sugerencia.',
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleLoadSuggestionIntoEditor = async (suggestion: AiSuggestion) => {
    const actorEmail = sessionEmail ?? 'local-admin';
    const questionDraft = buildDraftQuestionFromSuggestion(suggestion, actorEmail);

    if (!questionDraft) {
      setError('La sugerencia seleccionada no se puede abrir en el editor.');
      return;
    }

    setSelectedQuestionId(suggestion.targetQuestionId ?? null);
    setDraftQuestion(questionDraft);
    setDraftOriginSuggestionId(suggestion.id);
    setSelectedSuggestionId(suggestion.id);
    setIsCatalogDetailOpen(true);
    setActiveSection('catalog');
    setMessage('La sugerencia quedó cargada en el editor para revisión manual.');
    setError(null);

    if (suggestion.status === 'pending') {
      await handleSuggestionTransition(
        suggestion.id,
        'accepted',
        'La sugerencia quedó marcada como aceptada para edición.',
      );
    }
  };

  const handleCreateDraftFromSuggestion = async (suggestion: AiSuggestion) => {
    setIsBusy(true);
    setMessage(null);
    setError(null);

    try {
      const result = await createDraftFromAiSuggestion(suggestion);
      setAiWorkspace(result.workspace);
      await loadCatalog();
      setSelectedQuestionId(result.question.id);
      setDraftQuestion(cloneQuestion(result.question));
      setDraftOriginSuggestionId(null);
      setIsCatalogDetailOpen(true);
      setActiveSection('catalog');
      setMessage('La sugerencia se convirtió en draft dentro del catálogo.');
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'No se pudo convertir la sugerencia en draft.',
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleRequestLogin = async () => {
    setError(null);
    setMessage(null);

    try {
      await requestAdminMagicLink(loginEmail);
      setMessage('Se envió un enlace mágico a tu correo autorizado.');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesión.');
    }
  };

  const handleEditorialAction = async (
    action: EditorialAction,
    successMessage: string,
    notes?: string,
  ) => {
    if (!draftQuestion) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsBusy(true);

    const editorLabel = sessionEmail ?? 'local-admin';
    const questionToSave = prepareQuestionForAction(draftQuestion, editorLabel, action);
    const validationErrors = validateQuestionAction(questionToSave, action);

    if (validationErrors.length > 0) {
      setError(validationErrors.join(' '));
      setIsBusy(false);
      return;
    }

    try {
      await saveQuestion(questionToSave, action, notes);
      await loadCatalog();

      if (draftOriginSuggestionId) {
        const workspace = await markAiSuggestionApplied(draftOriginSuggestionId, questionToSave.id);
        setAiWorkspace(workspace);
        setDraftOriginSuggestionId(null);
      }

      setMessage(successMessage);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'No se pudo completar la acción editorial.',
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleSeed = async () => {
    setError(null);
    setMessage(null);
    setIsBusy(true);

    try {
      const result = await seedRemoteContent();
      setMessage(
        result.seeded
          ? 'Banco base sembrado correctamente.'
          : 'La base ya tenía contenido y no se volvió a sembrar.',
      );
      await loadCatalog();
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : 'No se pudo sembrar el contenido.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOutAdmin();
    setIsAdminAuthorized(false);
    setSessionEmail(null);
    setMessage('Sesión cerrada.');
  };

  const handleSelectSection = (section: AdminSection) => {
    setActiveSection(section);
    setIsSidebarOpen(false);
  };

  const editorPanel = (
    <EditorPanel
      activeEditionCode={activeEdition?.code}
      catalog={catalog}
      draftQuestion={draftQuestion}
      isBusy={isBusy}
      onEditorialAction={handleEditorialAction}
      onOptionCorrect={handleOptionCorrect}
      onOptionText={handleOptionText}
      onQuestionField={handleQuestionField}
    />
  );

  if (isLoading) {
    return (
      <section className="admin-auth-shell">
        <section className="panel admin-auth-panel">Cargando panel admin...</section>
      </section>
    );
  }

  if (!isSupabaseConfigured && !canUseLocalAdmin) {
    return (
      <section className="admin-auth-shell">
        <section className="panel admin-auth-panel">
          <span className="eyebrow">Admin</span>
          <h1 className="hero-title">Configura Supabase para activar el backoffice</h1>
          <p className="hero-copy">
            El panel admin depende de autenticación, trazabilidad y persistencia real. Mientras no exista configuración, esta ruta no se habilita en producción.
          </p>
        </section>
      </section>
    );
  }

  if (isSupabaseConfigured && !sessionEmail) {
    return (
      <section className="admin-auth-shell">
        <section className="panel admin-auth-panel">
          <span className="eyebrow">Admin privado</span>
          <h1 className="hero-title">Ingresa con tu correo autorizado</h1>
          <p className="hero-copy">
            El acceso usa magic link de Supabase y luego valida el correo contra la allowlist editorial.
          </p>
          <label className="field">
            <span>Correo</span>
            <input
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              placeholder="tu-correo@dominio.com"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
            />
          </label>
          {message && (
            <p className="success-banner" aria-live="polite">
              {message}
            </p>
          )}
          {error && (
            <p className="error-banner" aria-live="polite">
              {error}
            </p>
          )}
          <button className="primary-button" type="button" onClick={handleRequestLogin} disabled={!loginEmail}>
            Enviar enlace de acceso
          </button>
        </section>
      </section>
    );
  }

  if (isSupabaseConfigured && !isAdminAuthorized) {
    return (
      <section className="admin-auth-shell">
        <section className="panel admin-auth-panel">
          <span className="eyebrow">Admin privado</span>
          <h1 className="hero-title">Tu sesión no tiene permisos editoriales</h1>
          <p className="hero-copy">
            El correo autenticado debe existir en la allowlist admin de Supabase para acceder al panel.
          </p>
          <button className="secondary-button" type="button" onClick={handleSignOut}>
            Cerrar sesión
          </button>
        </section>
      </section>
    );
  }

  return (
    <section className="admin-route">
      <AdminSidebar
        activeSection={activeSection}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectSection={handleSelectSection}
      />

      <div className="admin-route__main">
        <AdminTopStrip
          activeEditionCode={activeEdition?.code}
          activeSection={activeSection}
          error={error}
          health={adminHealth}
          isBusy={isBusy}
          isSupabaseConfigured={isSupabaseConfigured}
          message={message}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onSeed={handleSeed}
          onSignOut={handleSignOut}
          sessionEmail={sessionEmail}
        />

        <div className="admin-route__body">
          {activeSection === 'dashboard' && (
            <DashboardView
              activeEditionCode={activeEdition?.code}
              chapterCoverage={chapterCoverage}
              editorialWarnings={editorialWarnings}
              health={adminHealth}
              healthNeedsHardening={healthNeedsHardening}
              isSupabaseConfigured={isSupabaseConfigured}
              onApplyQuickFilter={applyQuickFilter}
              onSelectQuestion={selectQuestion}
              sourceCoverage={sourceCoverage}
              summary={summary}
            />
          )}

          {activeSection === 'catalog' && (
            <CatalogManager
              editorPanel={editorPanel}
              filterEligibleOnly={filterEligibleOnly}
              filterStatus={filterStatus}
              filterWarningsOnly={filterWarningsOnly}
              isDetailOpen={isCatalogDetailOpen}
              onApplyQuickFilter={applyQuickFilter}
              onCloseDetail={() => setIsCatalogDetailOpen(false)}
              onSearchTermChange={setSearchTerm}
              onSelectQuestion={selectQuestion}
              questions={filteredQuestions}
              searchTerm={searchTerm}
              selectedQuestionId={selectedQuestionId}
              setFilterEligibleOnly={setFilterEligibleOnly}
              setFilterStatus={setFilterStatus}
              setFilterWarningsOnly={setFilterWarningsOnly}
              warningsByQuestionId={warningsByQuestionId}
            />
          )}

          {activeSection === 'ai' && (
            <AiQueueManager
              aiSummary={aiSummary}
              filteredSuggestions={filteredSuggestions}
              isBusy={isBusy}
              isDetailOpen={isAiDetailOpen}
              onCloseDetail={() => setIsAiDetailOpen(false)}
              onCreateDraftFromSuggestion={handleCreateDraftFromSuggestion}
              onGenerateSuggestions={handleGenerateSuggestions}
              onLoadSuggestionIntoEditor={handleLoadSuggestionIntoEditor}
              onSelectSuggestion={selectSuggestion}
              onTransitionSuggestion={handleSuggestionTransition}
              selectedSuggestion={selectedSuggestion}
              selectedSuggestionId={selectedSuggestionId}
              setSuggestionStatusFilter={setSuggestionStatusFilter}
              setSuggestionTypeFilter={setSuggestionTypeFilter}
              suggestionStatusFilter={suggestionStatusFilter}
              suggestionTypeFilter={suggestionTypeFilter}
            />
          )}
        </div>
      </div>
    </section>
  );
}
