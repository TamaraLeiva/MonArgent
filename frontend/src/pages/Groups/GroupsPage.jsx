import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import GroupDetailView from '../../components/groups/GroupDetailView';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { groupService } from '../../services/groupService';

import useLiveRefresh from '../../hooks/useLiveRefresh';
import { ChevronRight, Loader2, Trash2, Plus } from 'lucide-react';
import AppModal, { ModalActions, ModalField, modalInputClass } from '../../components/ui/AppModal';
import HelpTip from '../../components/ui/HelpTip';
import { HELP } from '../../content/helpContent';
import { formatPeso, formatPesoBalance } from '../../utils/format';
import useConfirmDialog from '../../hooks/useConfirmDialog';

const GroupsPage = () => {
  const { user, updateProfile } = useAuth();
  const { t } = usePreferences();

  const [groups, setGroups] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [aliasInput, setAliasInput] = useState(user?.mpAlias || '');
  const [savingAlias, setSavingAlias] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [listTab, setListTab] = useState('active');
  const [historyGroups, setHistoryGroups] = useState([]);
  const [deletingGroupId, setDeletingGroupId] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const loadData = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const [groupsRes, invitationsRes, historyRes] = await Promise.all([
        groupService.list(),
        groupService.listInvitations(),
        groupService.listHistory(),
      ]);
      setGroups(groupsRes.data);
      setInvitations(invitationsRes.data);
      setHistoryGroups(historyRes.data);
    } catch (err) {
      if (!silent) {
        setError(err.response?.data?.message || t('groups.loadError'));
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useLiveRefresh(
    () => loadData({ silent: true }),
    { enabled: !selectedGroup, intervalMs: 6000 },
  );

  useEffect(() => {
    setAliasInput(user?.mpAlias || '');
  }, [user?.mpAlias]);

  const openGroup = async (groupId) => {
    setError('');
    try {
      const { data } = await groupService.getById(groupId);
      setSelectedGroup(data);
    } catch (err) {
      setError(err.response?.data?.message || t('groups.openError'));
    }
  };

  const handleSaveAlias = async (e) => {
    e.preventDefault();
    if (!aliasInput.trim()) return;
    setSavingAlias(true);
    setError('');
    try {
      await updateProfile(aliasInput.trim());
      setSuccess('Alias guardado.');
    } catch (err) {
      setError(err.response?.data?.message || t('groups.saveAliasError'));
    } finally {
      setSavingAlias(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await groupService.create({ title: newTitle, description: newDescription });
      setShowCreate(false);
      setNewTitle('');
      setNewDescription('');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || t('groups.createError'));
    }
  };

  const handleAcceptInvitation = async (invitation) => {
    setError('');
    try {
      await groupService.acceptInvitation(invitation.id);
      await loadData({ silent: true });
      if (invitation.groupId) {
        await openGroup(invitation.groupId);
      } else {
        await loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || t('groups.acceptError'));
    }
  };

  const handleRejectInvitation = async (id) => {
    setError('');
    try {
      await groupService.rejectInvitation(id);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || t('groups.rejectError'));
    }
  };

  const handleDeleteGroup = async (e, group) => {
    e.stopPropagation();
    const ok = await askConfirm({
      title: t('groups.deleteGroup'),
      message: t('groups.deleteGroupConfirm', { title: group.title }),
      confirmLabel: t('common.delete'),
      danger: true,
    });
    if (!ok) {
      return;
    }
    setDeletingGroupId(group.id);
    setError('');
    try {
      await groupService.delete(group.id);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || t('groups.deleteError'));
    } finally {
      setDeletingGroupId(null);
    }
  };

  const handleGroupRefresh = useCallback((data, options) => {
    setSelectedGroup(data);
    if (!options?.silent) {
      loadData();
    }
  }, [loadData]);

  const handleGroupDeleted = useCallback(() => {
    setSelectedGroup(null);
    loadData();
  }, [loadData]);

  if (selectedGroup) {
    return (
      <Layout>
        {confirmDialog}
        <div className="text-white max-w-xl mx-auto">
          <GroupDetailView
            group={selectedGroup}
            onBack={() => setSelectedGroup(null)}
            onRefresh={handleGroupRefresh}
            onDeleted={handleGroupDeleted}
            onError={setError}
          />
          {error && <p className="text-sm text-red-300 text-center mt-2">{error}</p>}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {confirmDialog}
      <div className="text-white max-w-6xl mx-auto">

        <div className="mb-4 rounded-xl border border-cyan-400/40 bg-cyan-400/5 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-cyan-200">{t('groups.yourAlias')}</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {t('groups.aliasHelp')}
            </p>
          </div>
          <form onSubmit={handleSaveAlias} className="flex gap-2 items-center">
            <input
              minLength={3}
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              placeholder={t('groups.aliasPlaceholder')}
              className="flex-1 rounded-lg bg-[#0b2034] border border-[#284567] px-3 py-2 text-sm text-slate-100"
            />
            <button
              type="submit"
              disabled={savingAlias || !aliasInput.trim()}
              className="rounded-lg border border-[#284567] px-4 py-2 text-sm text-slate-200 disabled:opacity-50"
            >
              {savingAlias ? '...' : t('groups.save')}
            </button>
          </form>
        </div>

        {success && <p className="text-sm text-emerald-300 mb-3">{success}</p>}

        {invitations.length > 0 && (
          <section className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 space-y-2">
            <p className="text-sm font-semibold text-amber-300">{t('groups.invitations')}</p>
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {inv.invitedByName} {t('groups.invitedTo')} <strong>{inv.groupTitle}</strong>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAcceptInvitation(inv)}
                    className="rounded-lg bg-amber-400 text-slate-900 px-3 py-1 text-xs font-semibold"
                  >
                    {t('notifications.accept')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectInvitation(inv.id)}
                    className="rounded-lg border border-[#284567] px-3 py-1 text-xs"
                  >
                    {t('notifications.reject')}
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-amber-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <section className="rounded-2xl border border-orange-400/30 bg-[#0f2543] p-4">
              <p className="text-sm font-semibold text-orange-300 mb-1">{t('groups.history')}</p>
              <p className="text-xs text-slate-400 mb-3">{t('groups.closedHistory')}</p>
              <div className="space-y-2">
                {historyGroups.length === 0 ? (
                  <p className="text-slate-400 text-sm">{t('groups.noClosed')}</p>
                ) : (
                  historyGroups.map((group) => {
                    const expanded = expandedHistoryId === group.id;
                    return (
                      <article key={group.id} className="rounded-xl border border-[#284567] bg-[#102744]">
                        <button
                          type="button"
                          onClick={() => setExpandedHistoryId(expanded ? null : group.id)}
                          className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{group.title}</p>
                            <p className="text-[11px] text-slate-400">{t('groups.closed')} · {group.memberCount} {group.memberCount === 1 ? t('groups.member') : t('groups.members')}</p>
                          </div>
                          <ChevronRight size={16} className={`text-slate-500 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                        </button>
                        {expanded && (
                          <div className="px-3 pb-3 text-sm space-y-1 border-t border-slate-700/40 pt-2">
                            <p className="text-slate-300"><span className="text-slate-500">{t('groups.total')}:</span> <span className="font-amount">{formatPeso(group.totalExpenses)}</span></p>
                            <p className="text-slate-300"><span className="text-slate-500">{t('groups.balance')}:</span> <span className={`font-amount ${Number(group.myBalance) >= 0 ? 'text-money-income' : 'text-money-expense'}`}>{formatPesoBalance(group.myBalance)}</span></p>
                            <div className="flex gap-2 pt-1">
                              <button type="button" onClick={() => openGroup(group.id)} className="text-xs text-amber-300 font-semibold">{t('groups.viewDetail')}</button>
                              {group.owner && (
                                <button
                                  type="button"
                                  disabled={deletingGroupId === group.id}
                                  onClick={(e) => handleDeleteGroup(e, group)}
                                  className="text-xs text-red-300 disabled:opacity-50"
                                >
                                  {t('groups.delete')}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            <div className="space-y-4">
              <section className="rounded-2xl border border-emerald-400/30 bg-[#0f2543] p-4">
                <p className="text-sm font-semibold text-emerald-300 mb-1">{t('groups.active')}</p>
                <p className="text-xs text-slate-400 mb-3">{t('groups.activeDesc')}</p>
                <div className="space-y-2">
                  {groups.length === 0 ? (
                    <p className="text-slate-400 text-sm">{t('groups.noActive')}</p>
                  ) : (
                    groups.map((group) => (
                      <article
                        key={group.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openGroup(group.id)}
                        onKeyDown={(e) => e.key === 'Enter' && openGroup(group.id)}
                        className="bg-[#102744] border border-[#284567] rounded-lg p-3 cursor-pointer hover:border-amber-400/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{group.title}</p>
                            <p className="text-[11px] text-slate-400">{group.memberCount} {group.memberCount === 1 ? t('groups.member') : t('groups.members')} · {t('groups.total')} <span className="font-amount text-slate-300">{formatPeso(group.totalExpenses)}</span></p>
                            <p className="text-[11px] text-slate-400">{t('groups.balance')} <span className={`font-amount ${Number(group.myBalance) >= 0 ? 'text-money-income' : 'text-money-expense'}`}>{formatPesoBalance(group.myBalance)}</span></p>
                          </div>
                          <ChevronRight size={16} className="text-slate-500 shrink-0 mt-1" />
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-30 w-14 h-14 rounded-full bg-[#E8B923] text-slate-900 shadow-lg flex items-center justify-center hover:brightness-110"
          aria-label={t('groups.newGroupLabel')}
          title={t('groups.newGroupLabel')}
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>

        {showCreate && (
          <AppModal open title={t('groups.newGroupLabel')} onClose={() => setShowCreate(false)}>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <ModalField label={t('groups.titleField')}>
                <input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t('groups.groupTitlePlaceholder')}
                  className={modalInputClass}
                />
              </ModalField>
              <ModalField label={t('groups.descriptionField')}>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={t('groups.optional')}
                  className={`${modalInputClass} min-h-[80px] resize-none`}
                />
              </ModalField>
              <ModalActions onCancel={() => setShowCreate(false)} submitLabel={t('groups.createAction')} />
            </form>
          </AppModal>
        )}

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      </div>
    </Layout>
  );
};

export default GroupsPage;
