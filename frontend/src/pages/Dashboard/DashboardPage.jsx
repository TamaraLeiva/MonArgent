import React, { useEffect, useMemo, useCallback } from 'react';
import { useTransactions } from '../../context/TransactionContext';
import { usePreferences } from '../../context/PreferencesContext';
import Layout from '../../components/layout/Layout';

import ExpenseChartsSection from '../../components/dashboard/ExpenseChartsSection';
import useLiveRefresh from '../../hooks/useLiveRefresh';
import { CircleDollarSign, Wallet, ScanLine, Users, ShoppingCart, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatPeso, formatPesoSigned } from '../../utils/format';
import { formatArgentineDate } from '../../utils/datetime';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { transactions, categories, fetchTransactions, fetchCategories } = useTransactions();
  const { t } = usePreferences();


  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    fetchCategories();
    fetchTransactions(month, year);
  }, [fetchTransactions, fetchCategories, month, year]);

  const refreshSilently = useCallback(
    () => fetchTransactions(month, year, null, null, { silent: true }),
    [fetchTransactions, month, year],
  );

  useLiveRefresh(refreshSilently, { intervalMs: 6000 });

  const stats = useMemo(() => {
    const income = transactions
      .filter((tx) => tx.type === 'INCOME')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const expenses = transactions
      .filter((tx) => tx.type === 'EXPENSE')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    return {
      income,
      expenses,
      balance: income - expenses,
    };
  }, [transactions]);

  const recentTransactions = useMemo(
    () => [...transactions]
      .sort((a, b) => {
        const byDate = new Date(b.date) - new Date(a.date);
        if (byDate !== 0) return byDate;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      })
      .slice(0, 3),
    [transactions],
  );

  const quickActions = [
    { label: t('nav.income'), icon: CircleDollarSign, onClick: () => navigate('/transactions/income') },
    { label: t('nav.expense'), icon: Wallet, onClick: () => navigate('/transactions/expense') },
    { label: t('nav.scan'), icon: ScanLine, onClick: () => navigate('/scan') },
    { label: t('nav.groups'), icon: Users, onClick: () => navigate('/groups') },
  ];


  return (
    <Layout>
      <div className="max-w-7xl mx-auto text-slate-100 pb-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-4 min-w-0">
            <section className="rounded-3xl border border-[#284567] bg-[#0f2543] p-5">
              <p className="text-[10px] tracking-[0.25em] uppercase text-slate-400">{t('dashboard.balance')}</p>
              <h2 className="text-3xl sm:text-4xl font-amount text-money-balance mt-2">{formatPeso(stats.balance)}</h2>
              <div className="mt-4 h-px bg-[#2c496d]" />
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{t('dashboard.income')}</p>
                  <p className="text-xl font-amount text-money-income mt-1">{formatPeso(stats.income)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{t('dashboard.expense')}</p>
                  <p className="text-xl font-amount text-money-expense mt-1">{formatPeso(stats.expenses)}</p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-4 gap-3">
              {quickActions.map(({ label, icon: Icon, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className="rounded-2xl border border-[#284567] bg-[#0f2543] py-3 px-2 text-center hover:border-amber-400/60"
                >
                  <Icon size={16} className="mx-auto text-slate-200" />
                  <p className="text-[11px] mt-2 text-slate-200 leading-tight">{label}</p>
                </button>
              ))}
            </section>
          </div>

          <section className="rounded-3xl border border-[#284567] bg-[#0f2543] p-5 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-section-title">{t('dashboard.recent')}</h3>
              <button
                onClick={() => navigate('/transactions')}
                className="text-amber-300 text-sm font-semibold"
              >
                {t('common.seeAll')}
              </button>
            </div>

            <div className="space-y-1">
              {recentTransactions.length === 0 && (
                <p className="text-slate-400 text-sm py-2">{t('dashboard.noMoves')}</p>
              )}

              {recentTransactions.map((tx, index) => {
                const expense = tx.type === 'EXPENSE';
                return (
                  <article
                    key={tx.id ?? `${tx.title}-${index}`}
                    className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 px-2 py-1.5 text-sm rounded-md border ${expense ? 'border-red-400/20' : 'border-emerald-400/20'}`}
                  >
                    <span className="text-slate-100 truncate text-left">{tx.title || 'Movimiento'}</span>
                    <span className="text-slate-400 truncate text-left">{tx.categoryName || t('transactions.noCategory', 'Sin categoría')}</span>
                    <span className={`font-amount text-left truncate ${expense ? 'text-money-expense' : 'text-money-income'}`}>
                      {formatPesoSigned(tx.amount, tx.type)}
                    </span>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <ExpenseChartsSection categories={categories} compact />
      </div>
    </Layout>
  );
};

export default DashboardPage;
