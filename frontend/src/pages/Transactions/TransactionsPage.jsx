import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTransactions } from '../../context/TransactionContext';
import { usePreferences } from '../../context/PreferencesContext';
import Layout from '../../components/layout/Layout';

import MonthYearPicker from '../../components/ui/MonthYearPicker';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import { Plus, Trash2, Edit2, Loader2, Calendar } from 'lucide-react';
import {
  captureDeviceDateTime,
  formatArgentineDate,
  sortTransactionsByDateDesc,
  toDatetimeLocalValue,
  toIsoLocalDateTime,
} from '../../utils/datetime';
import {
  digitsFromNumericAmount,
  formatAmountFromDigits,
  parseAmountDigits,
  sanitizeAmountDigits,
  toBaseAmount,
} from '../../utils/currency';

import { formatPesoSigned } from '../../utils/format';
import AppModal, { ModalActions, ModalField, modalInputClass } from '../../components/ui/AppModal';
import useConfirmDialog from '../../hooks/useConfirmDialog';

const transactionModalTitle = (t, editingId, lockedType) => {
  if (editingId) return t('tx.edit');
  if (lockedType === 'INCOME') return t('tx.newIncome');
  if (lockedType === 'EXPENSE') return t('tx.newExpense');
  return t('tx.new');
};

const emptyForm = () => {
  const deviceNow = captureDeviceDateTime();
  return {
    title: '',
    description: '',
    amountDigits: '',
    amountDisplay: '',
    date: toIsoLocalDateTime(deviceNow),
    dateDisplay: formatArgentineDate(deviceNow),
    dateLocal: toDatetimeLocalValue(deviceNow),
    categoryId: '',
    type: '',
  };
};

const TransactionsPage = () => {
  const { t } = usePreferences();
  const {
    transactions,

    categories,
    loading,
    fetchTransactions,
    fetchCategories,
    createCategory,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterType, setFilterType] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('EXPENSE');
  const { askConfirm, confirmDialog } = useConfirmDialog();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const location = useLocation();
  const isIncomeRoute = location.pathname.includes('/transactions/income');
  const isExpenseRoute = location.pathname.includes('/transactions/expense');
  const isReadOnlyList = location.pathname === '/transactions';
  const lockedType = isIncomeRoute ? 'INCOME' : isExpenseRoute ? 'EXPENSE' : '';
  const effectiveFilterType = lockedType || filterType;

  useEffect(() => {
    if (isIncomeRoute) setFilterType('INCOME');
    else if (isExpenseRoute) setFilterType('EXPENSE');
    else setFilterType('');
  }, [isIncomeRoute, isExpenseRoute]);

  useEffect(() => {
    if (!filterCategoryId) return;
    const selected = categories.find((cat) => String(cat.id) === String(filterCategoryId));
    if (selected && effectiveFilterType && selected.type !== effectiveFilterType) {
      setFilterCategoryId('');
    }
  }, [effectiveFilterType, filterCategoryId, categories]);

  const visibleTransactions = sortTransactionsByDateDesc(
    effectiveFilterType
      ? transactions.filter((tx) => tx.type === effectiveFilterType)
      : transactions,
  );

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const created = await createCategory({ name: newCategoryName.trim(), type: newCategoryType });
      setNewCategoryName('');
      setShowCategoryModal(false);
      if (showModal && created?.id) {
        setFormData((prev) => ({
          ...prev,
          categoryId: created.id,
          type: created.type || prev.type || lockedType,
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || t('tx.createCatError'));
    }
  };

  useEffect(() => {
    fetchTransactions(month, year, filterCategoryId || null, effectiveFilterType || null);
  }, [month, year, filterCategoryId, effectiveFilterType, fetchTransactions]);

  const refreshSilently = useCallback(
    () => fetchTransactions(month, year, filterCategoryId || null, effectiveFilterType || null, { silent: true }),
    [month, year, filterCategoryId, effectiveFilterType, fetchTransactions],
  );

  useLiveRefresh(refreshSilently, { intervalMs: 6000 });

  const categoriesForType = (type) => {
    if (!type) return [];
    return categories.filter((category) => category.type === type);
  };

  const handleOpenModal = (transaction = null) => {
    if (transaction) {
      setEditingId(transaction.id);
      const transactionDate = transaction.date ? new Date(transaction.date) : captureDeviceDateTime();
      const amountDigits = digitsFromNumericAmount(transaction.amount);
      setFormData({
        title: transaction.title || '',
        description: transaction.description || '',
        amountDigits,
        amountDisplay: formatAmountFromDigits(amountDigits),
        date: toIsoLocalDateTime(transactionDate),
        dateDisplay: formatArgentineDate(transactionDate),
        dateLocal: toDatetimeLocalValue(transactionDate),
        categoryId: transaction.categoryId ?? '',
        type: transaction.type || '',
      });
    } else {
      setEditingId(null);
      const deviceNow = captureDeviceDateTime();
      setFormData({
        ...emptyForm(),
        type: lockedType || filterType || '',
        date: toIsoLocalDateTime(deviceNow),
        dateDisplay: formatArgentineDate(deviceNow),
        dateLocal: toDatetimeLocalValue(deviceNow),
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError('');
  };

  const handleChange = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleTypeChange = (e) => {
    const type = e.target.value;
    setFormData((prev) => {
      const selectedCategory = categories.find((c) => String(c.id) === String(prev.categoryId));
      const categoryStillValid = selectedCategory && selectedCategory.type === type;
      return {
        ...prev,
        type,
        categoryId: categoryStillValid ? prev.categoryId : '',
      };
    });
  };

  const handleAmountChange = (e) => {
    const digits = sanitizeAmountDigits(e.target.value);
    setFormData((prev) => ({
      ...prev,
      amountDigits: digits,
      amountDisplay: formatAmountFromDigits(digits),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const parsedAmount = parseAmountDigits(formData.amountDigits);
    const baseAmount = toBaseAmount(parsedAmount);
    if (!formData.title || !formData.categoryId || !formData.type || !formData.date) {
      setError(t('tx.requiredFields'));
      return;
    }
    if (Number.isNaN(baseAmount) || baseAmount <= 0) {
      setError(t('tx.amountGtZero'));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        title: formData.title,
        description: null,
        amount: baseAmount,

        date: formData.date,
        categoryId: parseInt(formData.categoryId, 10),
        type: lockedType || formData.type,
      };

      if (editingId) {
        await updateTransaction(editingId, payload);
      } else {
        await createTransaction(payload);
      }

      setShowModal(false);
      fetchTransactions(month, year, filterCategoryId || null, effectiveFilterType || null);
    } catch (err) {
      setError(err.response?.data?.message || t('tx.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await askConfirm({
      title: t('transactions.delete'),
      message: t('transactions.deleteConfirm'),
      confirmLabel: t('common.delete'),
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteTransaction(id);
      fetchTransactions(month, year, filterCategoryId || null, effectiveFilterType || null);
    } catch (err) {
      setError(err.response?.data?.message || t('tx.deleteError'));
    }
  };

  return (
    <Layout>
      {confirmDialog}
      <div className="max-w-7xl mx-auto px-2 sm:px-0">
        {/* Filters */}
        <div className={`grid gap-3 mb-6 items-end ${lockedType ? 'grid-cols-1 sm:grid-cols-[1fr_1fr_auto]' : 'grid-cols-1 sm:grid-cols-3'}`}>
          <MonthYearPicker
            label={t('transactions.period')}
            month={month}
            year={year}
            onChange={(m, y) => { setMonth(m); setYear(y); }}
          />
          <div className="flex items-end gap-2 min-w-0">
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="flex-1 h-10 px-3 py-2 bg-[#162238] border border-[#284567] rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-400 transition"
            >
              <option value="">{t('transactions.allCategories')}</option>
              {(effectiveFilterType
                ? categories.filter((cat) => cat.type === effectiveFilterType)
                : categories
              ).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {!isReadOnlyList && !lockedType && (
              <button
                onClick={() => { setNewCategoryType(effectiveFilterType || 'EXPENSE'); setShowCategoryModal(true); }}
                title={t('transactions.addCategory')}
                className="px-3 h-10 bg-amber-500 text-slate-900 rounded-lg hover:opacity-90 shrink-0"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
          {!lockedType ? (
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                if (e.target.value === '') setFilterCategoryId('');
              }}
              className="h-10 px-3 py-2 bg-[#162238] border border-[#284567] rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-400 transition"
            >
              <option value="">{t('transactions.allTypes')}</option>
              <option value="INCOME">{t('transactions.income')}</option>
              <option value="EXPENSE">{t('transactions.expense')}</option>
            </select>
          ) : (
            <span className="hidden sm:block" />
          )}
        </div>

        {!isReadOnlyList && (
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-30 w-14 h-14 rounded-full bg-[#E8B923] text-slate-900 shadow-lg flex items-center justify-center hover:brightness-110"
            aria-label={lockedType === 'INCOME' ? t('tx.newIncome') : lockedType === 'EXPENSE' ? t('tx.newExpense') : t('tx.new')}
            title={lockedType === 'INCOME' ? t('tx.newIncome') : lockedType === 'EXPENSE' ? t('tx.newExpense') : t('tx.new')}
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        )}

        {showCategoryModal && (
          <AppModal
            open
            title={t('transactions.newCategory')}

            onClose={() => setShowCategoryModal(false)}
            zIndex="z-[100]"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateCategory();
              }}
              className="space-y-4"
            >
              <ModalField label={t('tx.name')}>
                <input
                  type="text"
                  placeholder={
                    (effectiveFilterType || newCategoryType) === 'INCOME'
                      ? t('tx.salaryExample')
                      : t('tx.foodExample')
                  }
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className={modalInputClass}
                  required
                />
              </ModalField>
              {effectiveFilterType ? (
                <ModalField label={t('tx.type')}>
                  <div className={`${modalInputClass} flex items-center text-sm`}>
                    {effectiveFilterType === 'INCOME' ? t('tx.incomes') : t('tx.expenses')}
                  </div>
                </ModalField>
              ) : (
                <ModalField label={t('tx.type')}>
                  <select
                    value={newCategoryType}
                    onChange={(e) => setNewCategoryType(e.target.value)}
                    className={modalInputClass}
                  >
                    <option value="INCOME">{t('tx.incomes')}</option>
                    <option value="EXPENSE">{t('tx.expenses')}</option>
                  </select>
                </ModalField>
              )}
              <ModalActions onCancel={() => setShowCategoryModal(false)} submitLabel={t('common.save')} />
            </form>
          </AppModal>
        )}

        {/* Transaction list */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 size={32} className="text-amber-400 animate-spin" />
          </div>
        ) : visibleTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
            <Calendar size={40} className="opacity-40" />
            <p className="text-sm">
              {lockedType === 'INCOME'
                ? t('transactions.noIncome')
                : lockedType === 'EXPENSE'
                  ? t('transactions.noExpense')
                  : t('transactions.noMoves')}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {visibleTransactions.map((tx) => {
              const income = tx.type === 'INCOME';
              return (
                <div
                  key={tx.id}
                  className={`grid items-center gap-x-3 gap-y-1 px-3 py-2 rounded-lg border text-sm min-w-0 ${
                    income ? 'border-emerald-400/25 hover:border-emerald-400/45' : 'border-red-400/25 hover:border-red-400/45'
                  } ${lockedType ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,120px)_auto_auto]' : 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'}`}
                >
                  <span className="text-slate-100 font-medium truncate text-left">{tx.title}</span>
                  <span className="text-slate-400 truncate text-left">{tx.categoryName}</span>
                  {lockedType ? (
                    <>
                      <span className="text-slate-500 text-left hidden sm:block">{formatArgentineDate(tx.date)}</span>
                      <span className={`font-amount text-left shrink-0 ${income ? 'text-money-income' : 'text-money-expense'}`}>
                        {formatPesoSigned(tx.amount, tx.type)}
                      </span>
                      {!isReadOnlyList && (
                        <div className="flex gap-0.5 justify-end shrink-0">
                          <button onClick={() => handleOpenModal(tx)} className="p-1.5 hover:bg-white/5 rounded-md transition text-slate-400 hover:text-white" title={t('transactions.edit')}><Edit2 size={15} /></button>
                          <button onClick={() => handleDelete(tx.id)} className="p-1.5 hover:bg-red-500/10 rounded-md transition text-red-400 hover:text-red-300" title={t('transactions.deleteAction')}><Trash2 size={15} /></button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="hidden sm:grid grid-cols-2 gap-x-3 items-center min-w-0">
                      <span className="text-slate-500 text-left truncate">{formatArgentineDate(tx.date)}</span>
                      <span className={`font-amount text-left truncate ${income ? 'text-money-income' : 'text-money-expense'}`}>
                        {formatPesoSigned(tx.amount, tx.type)}
                      </span>
                    </div>
                  )}
                  <span className={`sm:hidden font-amount text-left shrink-0 ${income ? 'text-money-income' : 'text-money-expense'}`}>
                    {formatPesoSigned(tx.amount, tx.type)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {showModal && (
          <AppModal
            open
            title={transactionModalTitle(t, editingId, lockedType)}
            onClose={handleCloseModal}
          >
            {error && (
              <p className="text-red-400 text-sm mb-4 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <ModalField label={t('tx.title')}>
                <input
                  type="text"
                  placeholder={
                    lockedType === 'INCOME'
                      ? t('tx.salaryJune')
                      : lockedType === 'EXPENSE'
                        ? t('tx.bakery')
                        : formData.type === 'INCOME'
                          ? t('tx.salaryJune')
                          : formData.type === 'EXPENSE'
                            ? t('tx.bakery')
                            : t('tx.titleExample')
                  }
                  value={formData.title}
                  onChange={handleChange('title')}
                  className={modalInputClass}
                  required
                />
              </ModalField>
              <ModalField label={t('tx.amount')}>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="$ 1.000"
                  value={formData.amountDisplay}
                  onChange={handleAmountChange}
                  className={`${modalInputClass} font-amount`}
                  required
                />
              </ModalField>
              <ModalField label={t('tx.date')}>
                <input
                  type="date"
                  value={formData.dateLocal?.slice(0, 10) || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      dateLocal: v ? `${v}T12:00` : prev.dateLocal,
                      date: v ? `${v}T12:00:00` : prev.date,
                      dateDisplay: v || prev.dateDisplay,
                    }));
                  }}
                  className={modalInputClass}
                  required
                />
              </ModalField>
              {!lockedType && (
                <ModalField label={t('tx.type')}>
                  <select
                    value={formData.type}
                    onChange={handleTypeChange}
                    className={modalInputClass}
                    required
                  >
                    <option value="">{t('tx.selectType')}</option>
                    <option value="INCOME">{t('tx.income')}</option>
                    <option value="EXPENSE">{t('tx.expense')}</option>
                  </select>
                </ModalField>
              )}
              <ModalField label={t('tx.category')}>
                <div className="space-y-2">
                  {(formData.type || lockedType) && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewCategoryType(formData.type || lockedType);
                        setShowCategoryModal(true);
                      }}
                      className="text-xs text-amber-400 hover:underline"
                    >
                      {t('tx.addCategory')}
                    </button>
                  )}
                  <select
                    value={formData.categoryId}
                    onChange={handleChange('categoryId')}
                    className={modalInputClass}
                    disabled={!(formData.type || lockedType)}
                    required
                  >
                    <option value="">
                      {(formData.type || lockedType) ? t('tx.selectCategory') : t('tx.chooseTypeFirst')}
                    </option>
                    {categoriesForType(formData.type || lockedType).map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </ModalField>

              <ModalActions
                onCancel={handleCloseModal}
                submitLabel={editingId ? t('common.save') : t('scan.accept')}
                loading={submitting}
              />
            </form>
          </AppModal>
        )}
      </div>
    </Layout>
  );
};

export default TransactionsPage;
