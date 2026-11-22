import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import HelpTip from '../../components/ui/HelpTip';
import { HELP } from '../../content/helpContent';
import apiClient from '../../services/api';
import { Sparkles, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { formatPeso } from '../../utils/format';
import { usePreferences } from '../../context/PreferencesContext';
import { getErrorMessage } from '../../utils/apiErrors';
import AppModal, { ModalActions, ModalField, modalInputClass } from '../../components/ui/AppModal';
import {
  formatAmountFromDigits,
  parseAmountDigits,
  sanitizeAmountDigits,
  toBaseAmount,
} from '../../utils/currency';

const typeBorder = {
  SPENDING: 'border-l-red-500',
  SAVINGS: 'border-l-emerald-500',
  GOAL: 'border-l-[#E8B923]',
  ALERT: 'border-l-orange-500',
  GENERAL: 'border-l-sky-500',
};

const recommendationTypeLabels = {
  SPENDING: 'Gastos',
  SAVINGS: 'Ahorro',
  GOAL: 'Objetivo',
  ALERT: 'Alerta',
  GENERAL: 'General',
};

function formatMoneyInText(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\$\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?)/g, (_, num) => {
    const normalized = num.replace(/\./g, '').replace(',', '.');
    const value = Number(normalized);
    if (!Number.isFinite(value)) return `$${num}`;
    return formatPeso(value);
  });
}

const limitThresholdLabel = (pct) => {
  if (pct >= 100) return { text: '100% — superaste el límite', className: 'text-red-300' };
  if (pct >= 75) return { text: '75% del límite usado', className: 'text-orange-300' };
  if (pct >= 50) return { text: '50% del límite usado', className: 'text-amber-300' };
  return null;
};

const RecommendationsPage = () => {
  const { t, language } = usePreferences();
  const now = new Date();
  const [recommendations, setRecommendations] = useState([]);
  const [limits, setLimits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [limitForm, setLimitForm] = useState({ categoryId: '', amountDigits: '', amountDisplay: '' });
  const [limitSaving, setLimitSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);

  const loadCategories = useCallback(async () => {
    const { data } = await apiClient.get('/categories');
    setCategories((data || []).filter((c) => c.type === 'EXPENSE'));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const current = new Date();
      const [recRes, limRes] = await Promise.all([
        apiClient.get('/recommendations'),
        apiClient.get('/spending-limits'),
      ]);
      setRecommendations(recRes.data || []);
      const currentMonth = current.getMonth() + 1;
      const currentYear = current.getFullYear();
      setLimits((limRes.data || []).filter(
        (l) => l.month === currentMonth && l.year === currentYear
      ));
      await loadCategories();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron cargar los datos.'));
    } finally {
      setLoading(false);
    }
  }, [loadCategories]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const { data } = await apiClient.post('/recommendations/generate');
      setRecommendations(data || []);
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudieron generar recomendaciones. Verificá la conexión con la IA.'));
    } finally {
      setGenerating(false);
    }
  };

  const handleAddLimit = async (e) => {
    e.preventDefault();
    const parsed = toBaseAmount(parseAmountDigits(limitForm.amountDigits));
    if (!limitForm.categoryId || Number.isNaN(parsed) || parsed <= 0) return;
    setLimitSaving(true);
    try {
      await apiClient.post('/spending-limits', {
        categoryId: Number(limitForm.categoryId),
        amountLimit: parsed,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });
      setLimitForm({ categoryId: '', amountDigits: '', amountDisplay: '' });
      const { data } = await apiClient.get('/spending-limits');
      setLimits(data || []);
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo guardar el límite.'));
    } finally {
      setLimitSaving(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setCategorySaving(true);
    try {
      const { data } = await apiClient.post('/categories', { name, type: 'EXPENSE' });
      await loadCategories();
      setLimitForm((f) => ({ ...f, categoryId: String(data.id) }));
      setNewCategoryName('');
      setShowCategoryModal(false);
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo crear la categoría.'));
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteLimit = async (id) => {
    try {
      await apiClient.delete(`/spending-limits/${id}`);
      setLimits((prev) => prev.filter((l) => l.id !== id));
    } catch {
      setError(t('rec.deleteLimitError'));
    }
  };

  const monthLabel = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-AR', { month: 'long', year: 'numeric' }).format(now);

  return (
    <Layout>
      <div className="text-slate-100 max-w-6xl mx-auto pb-8">
        <div className="mb-4">
          <h2 className="text-section-title flex items-center gap-2">
            <Sparkles size={20} className="text-[#E8B923]" />
            {t('recommendations.title')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{t('rec.limitsSubtitle', { month: monthLabel })}</p>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">{error}</p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <section className="min-w-0">
            <div className="flex items-center gap-2 mb-3 min-h-[40px]">
              <p className="text-base sm:text-lg font-semibold text-slate-100 tracking-wide">{t('recommendations.limits')}</p>
              <HelpTip title={HELP.limits.title} body={HELP.limits.body} align="left" />
            </div>
            <div className="bg-[#102744] border border-[#274466] rounded-2xl p-4">
            <form onSubmit={handleAddLimit} className="space-y-3 mb-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">{t('rec.expenseCategory')}</label>
                <select
                  value={limitForm.categoryId}
                  onChange={(e) => setLimitForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="w-full rounded-lg bg-[#0b2034] border border-[#284567] px-3 py-2 text-sm"
                  required
                >
                  <option value="">{t('rec.selectCategory')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="text-xs text-amber-400 hover:underline mt-1.5"
                >
                  {t('rec.addCategory')}
                </button>
              </div>
              <div className="flex gap-2 items-end">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={t('rec.monthlyLimit')}
                  value={limitForm.amountDisplay}
                  onChange={(e) => {
                    const digits = sanitizeAmountDigits(e.target.value);
                    setLimitForm((f) => ({
                      ...f,
                      amountDigits: digits,
                      amountDisplay: formatAmountFromDigits(digits),
                    }));
                  }}
                  className="flex-1 rounded-lg bg-[#0b2034] border border-[#284567] px-3 py-2 text-sm font-amount"
                  required
                />
                {limitForm.categoryId && parseAmountDigits(limitForm.amountDigits) > 0 && !showCategoryModal && (
                  <button
                    type="submit"
                    disabled={limitSaving}
                    className="rounded-lg bg-amber-500 text-slate-900 px-4 py-2 text-sm font-semibold disabled:opacity-60 shrink-0"
                  >
                    {t('rec.add')}
                  </button>
                )}
              </div>
            </form>

            {limits.length === 0 ? (
              <p className="text-sm text-slate-400">{t('recommendations.limitEmpty')}</p>
            ) : (
              <div className="space-y-2">
                {limits.map((lim) => {
                  const pct = lim.amountLimit > 0
                    ? Math.min(100, Math.round((Number(lim.currentAmount) / Number(lim.amountLimit)) * 100))
                    : 0;
                  const threshold = limitThresholdLabel(pct);
                  const barColor = pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-orange-500' : pct >= 50 ? 'bg-amber-400' : 'bg-[#E8B923]';
                  return (
                    <article key={lim.id} className="rounded-xl bg-[#0f2440] border border-[#203d60] p-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-medium">{lim.categoryName}</p>
                          <p className="text-xs text-slate-400 font-amount">
                            {formatPeso(lim.currentAmount)} / {formatPeso(lim.amountLimit)}
                          </p>
                        </div>
                        <button type="button" onClick={() => handleDeleteLimit(lim.id)} className="text-red-300">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-[#2e4c72] overflow-hidden">
                        <div
                          className={`h-full ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {threshold && (
                        <p className={`text-xs mt-1 ${threshold.className}`}>{threshold.text}</p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
            </div>
          </section>

          <section className="min-w-0">
            <div className="flex items-center gap-2 mb-3 min-h-[40px]">
              <p className="text-base sm:text-lg font-semibold text-slate-100 tracking-wide">{t('recommendations.recommendations')}</p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center justify-center p-1 text-slate-300 hover:text-amber-300 disabled:opacity-60 shrink-0"
                aria-label={t('recommendations.new')}
                title={t('recommendations.new')}
              >
                {generating ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              </button>
            </div>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-[#E8B923]" size={32} />
              </div>
            ) : recommendations.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8 bg-[#102744] border border-[#274466] rounded-2xl">
                {t('recommendations.empty')}
              </p>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <article
                    key={rec.id}
                    className={`rounded-2xl border-l-4 ${typeBorder[rec.type] || typeBorder.GENERAL} border border-[#2a4a70] bg-[#102744] px-4 py-4 shadow-[0_0_0_1px_rgba(232,185,35,0.08)]`}
                  >
                    <p className="text-xs uppercase tracking-wide text-[#E8B923] mb-1">
                      {recommendationTypeLabels[rec.type] || recommendationTypeLabels.GENERAL}
                    </p>
                    <p className="text-sm text-slate-200 leading-relaxed">{formatMoneyInText(rec.message)}</p>
                    {rec.estimatedImpact != null && (
                      <p className="text-xs text-amber-200/90 mt-2 font-amount">
                        {t('rec.estimatedImpact', { amount: formatPeso(rec.estimatedImpact) })}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {showCategoryModal && (
          <AppModal open title={t('rec.newCategory')} onClose={() => setShowCategoryModal(false)}>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <ModalField label={t('rec.name')}>
                <input
                  type="text"
                  placeholder={t('rec.foodExample')}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className={modalInputClass}
                  autoFocus
                  required
                />
              </ModalField>
              <ModalActions
                onCancel={() => setShowCategoryModal(false)}
                submitLabel={t('common.save')}
                loading={categorySaving}
              />
            </form>
          </AppModal>
        )}
      </div>
    </Layout>
  );
};

export default RecommendationsPage;
