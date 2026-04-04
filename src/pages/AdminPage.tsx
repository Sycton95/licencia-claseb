import { useEffect, useMemo, useState } from 'react';
import { QuestionCard } from '../components/QuestionCard';
import {
  getContentCatalog,
  getCurrentSession,
  isCurrentUserAdmin,
  requestAdminMagicLink,
  saveQuestion,
  seedRemoteContent,
  signOutAdmin,
} from '../lib/contentRepository';
import { validateQuestionAction } from '../lib/contentValidation';
import { isSupabaseConfigured } from '../lib/supabase';
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
  error: string | null;
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
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [draftQuestion, setDraftQuestion] = useState<Question | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | EditorialStatus>('all');
  const [filterChapterId, setFilterChapterId] = useState<'all' | string>('all');
  const [filterSourceDocumentId, setFilterSourceDocumentId] = useState<'all' | string>('all');
  const [filterEligibleOnly, setFilterEligibleOnly] = useState(false);
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

      if (!searchTerm.trim()) {
        return true;
      }

      return question.prompt.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [catalog, filterChapterId, filterEligibleOnly, filterSourceDocumentId, filterStatus, searchTerm]);

  const activeEdition = catalog?.activeEdition;
  const healthNeedsHardening =
    isSupabaseConfigured &&
    (!adminHealth || adminHealth.schema !== 'v1' || !adminHealth.usesServiceRole);

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
                <strong>Service role</strong>
                <span>{adminHealth?.usesServiceRole ? 'activa' : 'pendiente'}</span>
              </div>
              <div className="menu-card">
                <strong>Base de datos</strong>
                <span>{adminHealth?.databaseReachable ? 'conectada' : 'sin conexión'}</span>
              </div>
            </div>
            {healthNeedsHardening && (
              <p className="info-text">
                Pendientes para cerrar la base operativa: ejecutar la migración `0002_solid_base_v1.sql`
                en Supabase y cargar `SUPABASE_SERVICE_ROLE_KEY` en Vercel.
              </p>
            )}
          </section>
        )}
      </section>

      <section className="admin-grid">
        <aside className="panel admin-sidebar">
          <h2 className="section-title">Preguntas</h2>
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
                <small>{question.status}</small>
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
                  onSelect={() => {}}
                  onConfirm={() => {}}
                  onNext={() => {}}
                />
              </div>
            </>
          )}
        </section>
      </section>
    </section>
  );
}
