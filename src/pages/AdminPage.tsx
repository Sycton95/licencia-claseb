import { useEffect, useMemo, useState } from 'react';
import { QuestionCard } from '../components/QuestionCard';
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
import { buildDraftQuestionFromSuggestion } from '../lib/aiSuggestionEngine';
import { validateQuestionAction } from '../lib/contentValidation';
import {
  buildChapterCoverage,
  buildSourceCoverage,
  getQuestionWarnings,
  type ChapterCoverageRow,
  type EditorialWarning,
  type SourceCoverageRow,
} from '../lib/editorialDiagnostics';
import { isSupabaseConfigured } from '../lib/supabase';
import type { AiSuggestion, AiSuggestionStatus, AiWorkspace } from '../types/ai';
import type {
  ContentCatalog,
  EditorialAction,
  EditorialStatus,
  Question,
} from '../types/content';

type AdminHealth = {
  ok: boolean;
  supabaseConfigured: boolean;
  usesServiceRole: boolean;
  databaseReachable: boolean;
  schema: string;
  aiSchemaReady?: boolean;
  error: string | null;
};

type AdminReportSummary = {
  totalQuestions: number;
  draftCount: number;
  reviewedCount: number;
  publishedCount: number;
  archivedCount: number;
  examEligibleCount: number;
};

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

  const canUseLocalAdmin =
    !isSupabaseConfigured &&
    (import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOCAL_ADMIN === 'true');

  const loadCatalog = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const contentCatalog = await getContentCatalog();
      setCatalog(contentCatalog);

      if (!selectedQuestionId && contentCatalog.questions.length > 0) {
        setSelectedQuestionId(contentCatalog.questions[0].id);
        setDraftQuestion(cloneQuestion(contentCatalog.questions[0]));
      } else if (selectedQuestionId) {
        const matchingQuestion = contentCatalog.questions.find(
          (question) => question.id === selectedQuestionId,
        );

        if (matchingQuestion) {
          setDraftQuestion(cloneQuestion(matchingQuestion));
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

      if (!selectedSuggestionId && workspace.suggestions.length > 0) {
        setSelectedSuggestionId(workspace.suggestions[0].id);
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

      if (!searchTerm.trim()) {
        return true;
      }

      return question.prompt.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [
    catalog,
    filterChapterId,
    filterEligibleOnly,
    filterSourceDocumentId,
    filterStatus,
    filterWarningsOnly,
    searchTerm,
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
    (!adminHealth || adminHealth.schema !== 'v1' || !adminHealth.usesServiceRole);

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
    setMessage(null);
    setError(null);
  };

  const selectSuggestion = (suggestionId: string) => {
    setSelectedSuggestionId(suggestionId);
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

      if (workspace.suggestions.length > 0) {
        setSelectedSuggestionId(workspace.suggestions[0].id);
      }

      const latestRun = workspace.runs[0];
      const generatedCount = latestRun?.summary.generatedCount ?? workspace.suggestions.length;
      setMessage(`Se actualizaron ${generatedCount} sugerencias AI para revisión.`);
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
      setError(saveError instanceof Error ? saveError.message : 'No se pudo completar la acción editorial.');
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

  if (isLoading) {
    return <section className="panel">Cargando panel admin...</section>;
  }

  if (!isSupabaseConfigured && !canUseLocalAdmin) {
    return (
      <section className="panel">
        <span className="eyebrow">Admin</span>
        <h1 className="hero-title">Configura Supabase para activar el backoffice</h1>
        <p className="hero-copy">
          El panel admin ya está pensado para trabajar con autenticación, trazabilidad y persistencia real.
          Mientras no exista configuración, esta ruta no se habilita en producción.
        </p>
      </section>
    );
  }

  if (isSupabaseConfigured && !sessionEmail) {
    return (
      <section className="panel">
        <span className="eyebrow">Admin privado</span>
        <h1 className="hero-title">Ingresa con tu correo autorizado</h1>
        <p className="hero-copy">
          El acceso usa magic link de Supabase y luego verifica tu email contra la allowlist editorial.
        </p>
        <label className="field">
          <span>Correo</span>
          <input
            type="email"
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            placeholder="tu-correo@dominio.com"
          />
        </label>
        {message && <p className="success-banner">{message}</p>}
        {error && <p className="error-banner">{error}</p>}
        <button className="primary-button" type="button" onClick={handleRequestLogin} disabled={!loginEmail}>
          Enviar enlace de acceso
        </button>
      </section>
    );
  }

  if (isSupabaseConfigured && !isAdminAuthorized) {
    return (
      <section className="panel">
        <span className="eyebrow">Admin privado</span>
        <h1 className="hero-title">Tu sesión no tiene permisos editoriales</h1>
        <p className="hero-copy">
          El correo autenticado debe existir en la allowlist admin de Supabase para acceder al panel.
        </p>
        <button className="secondary-button" type="button" onClick={handleSignOut}>
          Cerrar sesión
        </button>
      </section>
    );
  }

  return (
    <section className="page-stack admin-shell">
      <section className="panel panel--soft">
        <div className="admin-hero">
          <div>
            <span className="eyebrow">Backoffice editorial</span>
            <h1 className="hero-title">Revisión manual y publicación de preguntas</h1>
            <p className="hero-copy">
              Esta base ya separa contenido, flujo editorial y exposición pública. Las mutaciones en Vercel
              pasan por rutas server-side antes de tocar Supabase.
            </p>
          </div>
          <div className="admin-actions">
            {activeEdition && <span className="dev-pill">Edición activa: {activeEdition.code}</span>}
            {isSupabaseConfigured ? (
              <button className="secondary-button" type="button" onClick={handleSeed} disabled={isBusy}>
                Sembrar banco base
              </button>
            ) : (
              <span className="dev-pill">Modo local persistido en navegador</span>
            )}
            {isSupabaseConfigured && (
              <button className="secondary-button" type="button" onClick={handleSignOut} disabled={isBusy}>
                Cerrar sesión
              </button>
            )}
          </div>
        </div>
        {message && <p className="success-banner">{message}</p>}
        {error && <p className="error-banner">{error}</p>}
        {isSupabaseConfigured && (
          <section
            className={
              healthNeedsHardening
                ? 'admin-health-card admin-health-card--warning'
                : 'admin-health-card'
            }
          >
            <div className="admin-health-head">
              <div>
                <h2 className="section-title">Estado operativo</h2>
                <p className="info-text">
                  Esta tarjeta resume si la plataforma ya quedó endurecida para operar sin depender del
                  navegador.
                </p>
              </div>
              {adminHealth?.ok ? (
                <span className="dev-pill">API operativa</span>
              ) : (
                <span className="error-banner">API pendiente</span>
              )}
            </div>
            <div className="admin-health-grid">
              <div className="menu-card">
                <strong>Esquema</strong>
                <span>{adminHealth?.schema ?? 'sin datos'}</span>
              </div>
              <div className="menu-card">
                <strong>AI schema</strong>
                <span>{adminHealth?.aiSchemaReady ? 'activo' : 'pendiente'}</span>
              </div>
              <div className="menu-card">
                <strong>Service role</strong>
                <span>{adminHealth?.usesServiceRole ? 'activa' : 'pendiente'}</span>
              </div>
              <div className="menu-card">
                <strong>Base de datos</strong>
                <span>{adminHealth?.databaseReachable ? 'conectada' : 'sin conexión'}</span>
              </div>
            </div>
            {!adminHealth?.aiSchemaReady && (
              <p className="info-text">
                La cola AI requiere aplicar la migración `0003_ai_suggestions.sql` en Supabase antes de
                poder generar o persistir sugerencias.
              </p>
            )}
            {healthNeedsHardening && (
              <p className="info-text">
                Pendientes para cerrar la base operativa: ejecutar la migración `0002_solid_base_v1.sql`
                en Supabase y cargar `SUPABASE_SERVICE_ROLE_KEY` en Vercel.
              </p>
            )}
          </section>
        )}
        {summary && (
          <section className="admin-report-stack">
            <div className="admin-report-grid">
              <button type="button" className="admin-report-card" onClick={() => applyQuickFilter('all')}>
                <strong>Total</strong>
                <span>{summary.totalQuestions}</span>
              </button>
              <button type="button" className="admin-report-card" onClick={() => applyQuickFilter('draft')}>
                <strong>Draft</strong>
                <span>{summary.draftCount}</span>
              </button>
              <button
                type="button"
                className="admin-report-card"
                onClick={() => applyQuickFilter('reviewed')}
              >
                <strong>Reviewed</strong>
                <span>{summary.reviewedCount}</span>
              </button>
              <button
                type="button"
                className="admin-report-card"
                onClick={() => applyQuickFilter('published')}
              >
                <strong>Published</strong>
                <span>{summary.publishedCount}</span>
              </button>
              <button
                type="button"
                className="admin-report-card"
                onClick={() => applyQuickFilter('archived')}
              >
                <strong>Archived</strong>
                <span>{summary.archivedCount}</span>
              </button>
              <button type="button" className="admin-report-card" onClick={() => applyQuickFilter('exam')}>
                <strong>Aptas examen</strong>
                <span>{summary.examEligibleCount}</span>
              </button>
              <button
                type="button"
                className="admin-report-card admin-report-card--warning"
                onClick={() => applyQuickFilter('warnings')}
              >
                <strong>Warnings</strong>
                <span>{editorialWarnings.length}</span>
              </button>
            </div>

            <div className="admin-report-layout">
              <section className="admin-report-panel">
                <div className="admin-report-head">
                  <div>
                    <h2 className="section-title">Cobertura por capitulo</h2>
                    <p className="info-text">
                      Total de preguntas, publicadas y revisadas pendientes por capitulo.
                    </p>
                  </div>
                </div>
                <div className="admin-coverage-list">
                  {chapterCoverage.map((row) => (
                    <article key={row.chapterId} className="admin-coverage-card">
                      <div>
                        <strong>
                          {row.chapterCode} · {row.chapterTitle}
                        </strong>
                      </div>
                      <div className="admin-metric-row">
                        <span>Total: {row.total}</span>
                        <span>Published: {row.published}</span>
                        <span>Reviewed pendientes: {row.reviewedPending}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="admin-report-panel">
                <div className="admin-report-head">
                  <div>
                    <h2 className="section-title">Cobertura por fuente</h2>
                    <p className="info-text">
                      Detecta fuentes con preguntas sin referencia textual clara.
                    </p>
                  </div>
                </div>
                <div className="admin-coverage-list">
                  {sourceCoverage.map((row) => (
                    <article key={row.sourceDocumentId} className="admin-coverage-card">
                      <div>
                        <strong>{row.title}</strong>
                      </div>
                      <div className="admin-metric-row">
                        <span>Total: {row.total}</span>
                        <span>Sin referencia: {row.missingReferenceCount}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="admin-report-panel">
                <div className="admin-report-head">
                  <div>
                    <h2 className="section-title">Warnings editoriales</h2>
                    <p className="info-text">
                      Visibilidad de riesgos antes de publicar o ampliar el banco.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="secondary-button secondary-button--compact"
                    onClick={() => applyQuickFilter('warnings')}
                  >
                    Ver solo warnings
                  </button>
                </div>
                <div className="admin-warning-list">
                  {editorialWarnings.length === 0 ? (
                    <article className="admin-warning-card admin-warning-card--ok">
                      <strong>Sin warnings editoriales</strong>
                      <span>El catalogo cargado no expone inconsistencias en estas reglas de control.</span>
                    </article>
                  ) : (
                    editorialWarnings.map((warning) => (
                      <button
                        key={warning.id}
                        type="button"
                        className="admin-warning-card"
                        onClick={() => selectQuestion(warning.questionId)}
                      >
                        <strong>{warning.title}</strong>
                        <span>{warning.detail}</span>
                        <small>{warning.questionId}</small>
                      </button>
                    ))
                  )}
                </div>
              </section>
            </div>
          </section>
        )}
      </section>

      <section className="panel admin-ai-shell">
        <div className="admin-report-head">
          <div>
            <span className="eyebrow">Sugerencias AI</span>
            <h2 className="section-title">Cola privada de expansión y revisión</h2>
            <p className="info-text">
              La AI propone drafts, rewrites, flags y brechas de cobertura. Nada se publica sin revisión manual.
            </p>
          </div>
          <div className="admin-actions">
            {aiWorkspace?.runs[0] && (
              <span className="dev-pill">
                Última corrida: {new Date(aiWorkspace.runs[0].createdAt).toLocaleString()}
              </span>
            )}
            <button
              className="secondary-button"
              type="button"
              onClick={handleGenerateSuggestions}
              disabled={isBusy}
            >
              Actualizar sugerencias
            </button>
          </div>
        </div>

        {aiSummary && (
          <div className="admin-report-grid admin-report-grid--tight">
            <article className="admin-report-card">
              <strong>Total AI</strong>
              <span>{aiSummary.total}</span>
            </article>
            <article className="admin-report-card">
              <strong>Pendientes</strong>
              <span>{aiSummary.pending}</span>
            </article>
            <article className="admin-report-card">
              <strong>Aceptadas</strong>
              <span>{aiSummary.accepted}</span>
            </article>
            <article className="admin-report-card">
              <strong>Aplicadas</strong>
              <span>{aiSummary.applied}</span>
            </article>
            <article className="admin-report-card admin-report-card--warning">
              <strong>Flags</strong>
              <span>{aiSummary.flags}</span>
            </article>
            <article className="admin-report-card">
              <strong>Brechas</strong>
              <span>{aiSummary.coverageGaps}</span>
            </article>
          </div>
        )}

        <div className="admin-ai-grid">
          <aside className="admin-ai-sidebar">
            <div className="admin-filter-chip-row">
              <button
                type="button"
                className="admin-filter-chip"
                onClick={() => {
                  setSuggestionTypeFilter('all');
                  setSuggestionStatusFilter('all');
                }}
              >
                Todas
              </button>
              <button
                type="button"
                className="admin-filter-chip"
                onClick={() => setSuggestionTypeFilter('new_question')}
              >
                Nuevas
              </button>
              <button
                type="button"
                className="admin-filter-chip"
                onClick={() => setSuggestionTypeFilter('rewrite')}
              >
                Rewrites
              </button>
              <button
                type="button"
                className="admin-filter-chip"
                onClick={() => setSuggestionTypeFilter('flag')}
              >
                Flags
              </button>
              <button
                type="button"
                className="admin-filter-chip"
                onClick={() => setSuggestionTypeFilter('coverage_gap')}
              >
                Brechas
              </button>
            </div>

            <div className="field-stack">
              <label className="field">
                <span>Estado sugerencia</span>
                <select
                  value={suggestionStatusFilter}
                  onChange={(event) =>
                    setSuggestionStatusFilter(event.target.value as 'all' | AiSuggestionStatus)
                  }
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="applied">Applied</option>
                  <option value="deferred">Deferred</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <label className="field">
                <span>Capítulo AI</span>
                <select
                  value={suggestionChapterFilter}
                  onChange={(event) => setSuggestionChapterFilter(event.target.value)}
                >
                  <option value="all">Todos</option>
                  {catalog?.chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Fuente AI</span>
                <select
                  value={suggestionSourceFilter}
                  onChange={(event) => setSuggestionSourceFilter(event.target.value)}
                >
                  <option value="all">Todas</option>
                  {catalog?.sourceDocuments.map((sourceDocument) => (
                    <option key={sourceDocument.id} value={sourceDocument.id}>
                      {sourceDocument.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="admin-ai-list">
              {filteredSuggestions.length === 0 ? (
                <article className="admin-warning-card admin-warning-card--ok">
                  <strong>Sin sugerencias cargadas</strong>
                  <span>Genera una corrida AI para poblar la cola privada de revisión.</span>
                </article>
              ) : (
                filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className={
                      selectedSuggestionId === suggestion.id
                        ? 'admin-question-card admin-question-card--selected'
                        : 'admin-question-card'
                    }
                    onClick={() => selectSuggestion(suggestion.id)}
                  >
                    <strong>{suggestion.suggestionType}</strong>
                    <span>{suggestion.prompt}</span>
                    <small>
                      {suggestion.status}
                      {suggestion.chapterId ? ` · ${suggestion.chapterId}` : ''}
                    </small>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="admin-ai-detail">
            {!selectedSuggestion ? (
              <article className="admin-warning-card admin-warning-card--ok">
                <strong>Selecciona una sugerencia</strong>
                <span>La cola AI sirve como bandeja de entrada para expansión y correcciones.</span>
              </article>
            ) : (
              <div className="admin-ai-card">
                <div className="admin-editor-head">
                  <div>
                    <h3 className="section-title">Detalle de sugerencia</h3>
                    <p className="info-text">
                      Tipo: <strong>{selectedSuggestion.suggestionType}</strong> · Estado:{' '}
                      <strong>{selectedSuggestion.status}</strong> · Confianza:{' '}
                      <strong>{Math.round(selectedSuggestion.confidence * 100)}%</strong>
                    </p>
                  </div>
                  <div className="admin-status-row">
                    <span className="dev-pill">{selectedSuggestion.provider}</span>
                    {selectedSuggestion.sourceReference && (
                      <span className="dev-pill">{selectedSuggestion.sourceReference}</span>
                    )}
                  </div>
                </div>

                <div className="field-grid">
                  <label className="field field--full">
                    <span>Prompt sugerido</span>
                    <textarea rows={4} value={selectedSuggestion.prompt} readOnly />
                  </label>
                  <label className="field field--full">
                    <span>Grounding</span>
                    <textarea rows={3} value={selectedSuggestion.groundingExcerpt} readOnly />
                  </label>
                  <label className="field field--full">
                    <span>Rationale</span>
                    <textarea rows={3} value={selectedSuggestion.rationale} readOnly />
                  </label>
                  {selectedSuggestion.reviewNotes && (
                    <label className="field field--full">
                      <span>Notas de revisión AI</span>
                      <textarea rows={2} value={selectedSuggestion.reviewNotes} readOnly />
                    </label>
                  )}
                </div>

                {selectedSuggestion.suggestedOptions.length > 0 && (
                  <div className="admin-options">
                    <h3>Opciones sugeridas</h3>
                    {selectedSuggestion.suggestedOptions.map((option, index) => (
                      <div key={`${selectedSuggestion.id}-option-${index}`} className="admin-option-row">
                        <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                        <input value={option} readOnly />
                        <label className="checkbox-field">
                          <input
                            type="checkbox"
                            checked={selectedSuggestion.suggestedCorrectAnswers.includes(index)}
                            readOnly
                          />
                          <span>Correcta</span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                <div className="admin-save-row admin-save-row--split">
                  {(selectedSuggestion.suggestionType === 'new_question' ||
                    selectedSuggestion.suggestionType === 'rewrite') && (
                    <>
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => handleLoadSuggestionIntoEditor(selectedSuggestion)}
                        disabled={isBusy}
                      >
                        Cargar en editor
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => handleCreateDraftFromSuggestion(selectedSuggestion)}
                        disabled={isBusy}
                      >
                        Crear draft
                      </button>
                    </>
                  )}
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      handleSuggestionTransition(
                        selectedSuggestion.id,
                        'deferred',
                        'La sugerencia quedó postergada para revisión posterior.',
                      )
                    }
                    disabled={isBusy}
                  >
                    Postergar
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      handleSuggestionTransition(
                        selectedSuggestion.id,
                        'rejected',
                        'La sugerencia quedó rechazada.',
                      )
                    }
                    disabled={isBusy}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="admin-grid">
        <aside className="panel admin-sidebar">
          <h2 className="section-title">Preguntas</h2>
          <div className="admin-filter-chip-row">
            <button type="button" className="admin-filter-chip" onClick={() => applyQuickFilter('all')}>
              Todas
            </button>
            <button type="button" className="admin-filter-chip" onClick={() => applyQuickFilter('draft')}>
              Draft
            </button>
            <button type="button" className="admin-filter-chip" onClick={() => applyQuickFilter('reviewed')}>
              Reviewed
            </button>
            <button type="button" className="admin-filter-chip" onClick={() => applyQuickFilter('published')}>
              Published
            </button>
            <button type="button" className="admin-filter-chip" onClick={() => applyQuickFilter('exam')}>
              Examen
            </button>
            <button type="button" className="admin-filter-chip" onClick={() => applyQuickFilter('warnings')}>
              Warnings
            </button>
          </div>
          <div className="field-stack">
            <label className="field">
              <span>Buscar</span>
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
            </label>
            <label className="field">
              <span>Estado</span>
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as 'all' | EditorialStatus)}
              >
                <option value="all">Todos</option>
                <option value="draft">Draft</option>
                <option value="reviewed">Reviewed</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="field">
              <span>Capítulo</span>
              <select value={filterChapterId} onChange={(event) => setFilterChapterId(event.target.value)}>
                <option value="all">Todos</option>
                {catalog?.chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Fuente</span>
              <select
                value={filterSourceDocumentId}
                onChange={(event) => setFilterSourceDocumentId(event.target.value)}
              >
                <option value="all">Todas</option>
                {catalog?.sourceDocuments.map((sourceDocument) => (
                  <option key={sourceDocument.id} value={sourceDocument.id}>
                    {sourceDocument.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={filterEligibleOnly}
                onChange={(event) => setFilterEligibleOnly(event.target.checked)}
              />
              <span>Solo aptas para examen</span>
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={filterWarningsOnly}
                onChange={(event) => setFilterWarningsOnly(event.target.checked)}
              />
              <span>Solo con warnings</span>
            </label>
          </div>

          <div className="admin-question-list">
            {filteredQuestions.map((question) => (
              <button
                key={question.id}
                type="button"
                className={
                  selectedQuestionId === question.id
                    ? 'admin-question-card admin-question-card--selected'
                    : 'admin-question-card'
                }
                onClick={() => selectQuestion(question.id)}
              >
                <strong>{question.id}</strong>
                <span>{question.prompt}</span>
                <small>
                  {question.status}
                  {warningsByQuestionId.get(question.id)?.length
                    ? ` · ${warningsByQuestionId.get(question.id)?.length} warning(s)`
                    : ''}
                </small>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel admin-editor">
          {!draftQuestion ? (
            <p>Selecciona una pregunta para editarla.</p>
          ) : (
            <>
              <div className="admin-editor-head">
                <div>
                  <h2 className="section-title">Editor</h2>
                  <p className="info-text">
                    Estado actual: <strong>{draftQuestion.status}</strong> · Fuente: <strong>{draftQuestion.sourceReference ?? `Pág. ${draftQuestion.sourcePage}`}</strong>
                  </p>
                </div>
                <div className="admin-status-row">
                  <span className="dev-pill">Edición {activeEdition?.code ?? draftQuestion.editionId}</span>
                </div>
              </div>

              <div className="field-grid">
                <label className="field field--full">
                  <span>Enunciado</span>
                  <textarea
                    rows={4}
                    value={draftQuestion.prompt}
                    onChange={(event) => handleQuestionField('prompt', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Capítulo</span>
                  <select
                    value={draftQuestion.chapterId}
                    onChange={(event) => handleQuestionField('chapterId', event.target.value)}
                  >
                    {catalog?.chapters.map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>
                        {chapter.code} · {chapter.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Modo de respuesta</span>
                  <select
                    value={draftQuestion.selectionMode}
                    onChange={(event) =>
                      handleQuestionField('selectionMode', event.target.value as Question['selectionMode'])
                    }
                  >
                    <option value="single">single</option>
                    <option value="multiple">multiple</option>
                  </select>
                </label>
                <label className="field">
                  <span>Documento fuente</span>
                  <select
                    value={draftQuestion.sourceDocumentId}
                    onChange={(event) => handleQuestionField('sourceDocumentId', event.target.value)}
                  >
                    {catalog?.sourceDocuments.map((sourceDocument) => (
                      <option key={sourceDocument.id} value={sourceDocument.id}>
                        {sourceDocument.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Página fuente</span>
                  <input
                    type="number"
                    value={draftQuestion.sourcePage}
                    onChange={(event) => handleQuestionField('sourcePage', Number(event.target.value))}
                  />
                </label>
                <label className="field field--full">
                  <span>Referencia fuente</span>
                  <input
                    value={draftQuestion.sourceReference ?? ''}
                    onChange={(event) => handleQuestionField('sourceReference', event.target.value)}
                    placeholder="Pág. 35, tabla principal, figura 2, etc."
                  />
                </label>
                <label className="field field--full">
                  <span>Instrucción</span>
                  <input
                    value={draftQuestion.instruction}
                    onChange={(event) => handleQuestionField('instruction', event.target.value)}
                  />
                </label>
                <label className="field field--full">
                  <span>Explicación pública opcional</span>
                  <textarea
                    rows={3}
                    value={draftQuestion.publicExplanation ?? ''}
                    onChange={(event) => handleQuestionField('publicExplanation', event.target.value)}
                  />
                </label>
                <label className="field field--full">
                  <span>Notas editoriales</span>
                  <textarea
                    rows={3}
                    value={draftQuestion.reviewNotes ?? ''}
                    onChange={(event) => handleQuestionField('reviewNotes', event.target.value)}
                  />
                </label>
              </div>

              <div className="field-inline">
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={draftQuestion.isOfficialExamEligible}
                    onChange={(event) =>
                      handleQuestionField('isOfficialExamEligible', event.target.checked)
                    }
                  />
                  <span>Apta para modo examen</span>
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={draftQuestion.doubleWeight}
                    onChange={(event) => handleQuestionField('doubleWeight', event.target.checked)}
                  />
                  <span>Doble puntuación</span>
                </label>
              </div>

              <div className="admin-options">
                <h3>Opciones</h3>
                {draftQuestion.options.map((option) => (
                  <div key={option.id} className="admin-option-row">
                    <span className="option-letter">{option.label}</span>
                    <input value={option.text} onChange={(event) => handleOptionText(option.id, event.target.value)} />
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={option.isCorrect}
                        onChange={(event) => handleOptionCorrect(option.id, event.target.checked)}
                      />
                      <span>Correcta</span>
                    </label>
                  </div>
                ))}
              </div>

              <div className="admin-save-row admin-save-row--split">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => handleEditorialAction('save', 'Cambios guardados correctamente.')}
                  disabled={isBusy}
                >
                  Guardar cambios
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() =>
                    handleEditorialAction('mark_reviewed', 'Pregunta marcada como revisada.')
                  }
                  disabled={isBusy}
                >
                  Marcar revisada
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => handleEditorialAction('publish', 'Pregunta publicada correctamente.')}
                  disabled={isBusy}
                >
                  Publicar
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => handleEditorialAction('archive', 'Pregunta archivada correctamente.')}
                  disabled={isBusy}
                >
                  Archivar
                </button>
              </div>

              <div className="admin-preview">
                <h3>Vista previa</h3>
                <QuestionCard
                  question={draftQuestion}
                  selectedOptionIds={[]}
                  isAnswered={false}
                  showReference={false}
                  onSelect={() => {}}
                  onConfirm={() => {}}
                  onNext={() => {}}
                  onToggleReference={() => {}}
                />
              </div>
            </>
          )}
        </section>
      </section>
    </section>
  );
}
