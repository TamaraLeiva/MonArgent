import React, { useEffect, useRef, useState } from 'react';
import { Eye, FileText, KeyRound, LogOut, X } from 'lucide-react';
import apiClient from '../../services/api';
import { documentService } from '../../services/documentService';
import { getErrorMessage } from '../../utils/apiErrors';
import { formatPeso } from '../../utils/format';
import { openProofBlob, resolveProofContentType } from '../../utils/proofBlob';
import useKeyboardOffset from '../../hooks/useKeyboardOffset';
import { usePreferences } from '../../context/PreferencesContext';

const UserMenu = ({ initials, email, onLogout }) => {
  const { t } = usePreferences();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState('menu');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [openingDocId, setOpeningDocId] = useState(null);
  const keyboardOffset = useKeyboardOffset(open && panel === 'password');
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
        setPanel('menu');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeMenu = () => {
    setOpen(false);
    setPanel('menu');
    setErrorMsg('');
  };

  const loadDocuments = async () => {
    setLoadingDocs(true);
    setErrorMsg('');
    try {
      const { data } = await documentService.listReceived();
      setDocuments(data);
    } catch (error) {
      setErrorMsg(getErrorMessage(error, t('menu.docsLoadError')));
    } finally {
      setLoadingDocs(false);
    }
  };

  const openDocuments = () => {
    setPanel('documents');
    setErrorMsg('');
    loadDocuments();
  };

  const openDocument = async (doc) => {
    setOpeningDocId(doc.id);
    setErrorMsg('');
    try {
      const response = await documentService.download(
        doc.groupId,
        doc.fromMemberKey,
        doc.toMemberKey,
      );
      const contentType = resolveProofContentType(response.headers, doc.contentType);
      openProofBlob(response.data, contentType);
    } catch (error) {
      setErrorMsg(getErrorMessage(error, t('menu.docOpenError')));
    } finally {
      setOpeningDocId(null);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
        passwordConfirm: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      closeMenu();
      onLogout?.();
    } catch (error) {
      setErrorMsg(getErrorMessage(error, t('menu.passwordChangeError')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-9 h-9 rounded-full border border-[#2a4466] bg-[#102946] text-slate-100 text-xs font-semibold flex items-center justify-center"
        aria-label={t('layout.profileMenu')}
      >
        {initials}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={closeMenu}
            aria-hidden
          />
          <div
            className="fixed left-0 right-0 top-[97px] bottom-0 z-50 flex flex-col bg-[#0f2543] border-t border-[#284567] shadow-2xl p-4 overflow-y-auto md:left-auto md:right-6 md:top-[53px] md:bottom-auto md:w-80 md:rounded-b-xl md:border md:max-h-[80vh]"
            style={{ paddingBottom: keyboardOffset ? `${keyboardOffset + 16}px` : undefined }}
          >
            <div className="flex justify-end mb-2 md:hidden">
              <button
                type="button"
                onClick={closeMenu}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a3457]"
                aria-label={t('layout.closeMenu')}
              >
                <X size={18} />
              </button>
            </div>

            {panel === 'menu' && (
              <div className="space-y-1 flex-1 md:flex-none">
                {email && (
                  <div className="px-3 py-2 mb-1 border-b border-[#284567]/60">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">{t('menu.account')}</p>
                    <p className="text-sm text-slate-200 truncate">{email}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={openDocuments}
                  className="w-full flex items-center gap-2 px-3 py-3 md:py-2 rounded-lg text-sm text-slate-200 hover:bg-[#1a3457] transition-colors"
                >
                  <FileText size={16} />
                  {t('menu.documents')}
                </button>
                <button
                  type="button"
                  onClick={() => { setPanel('password'); setErrorMsg(''); }}
                  className="w-full flex items-center gap-2 px-3 py-3 md:py-2 rounded-lg text-sm text-slate-200 hover:bg-[#1a3457] transition-colors"
                >
                  <KeyRound size={16} />
                  {t('menu.changePassword')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-3 md:py-2 rounded-lg text-sm text-red-300 hover:bg-red-900/20 transition-colors"
                >
                  <LogOut size={16} />
                  {t('menu.logout')}
                </button>
              </div>
            )}

            {panel === 'documents' && (
              <div className="space-y-3 flex-1 md:flex-none">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-100">{t('menu.documents')}</p>
                  <button
                    type="button"
                    onClick={() => setPanel('menu')}
                    className="text-xs text-slate-400 hover:text-amber-300"
                  >
                    {t('menu.back')}
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  {t('menu.receiptsHelp')}
                </p>
                {loadingDocs ? (
                  <p className="text-sm text-slate-400">{t('common.loading')}</p>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('menu.noReceipts')}</p>
                ) : (
                  <ul className="space-y-2">
                    {documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="rounded-lg border border-[#284567] bg-[#0b2034]/50 p-3 text-sm"
                      >
                        <p className="font-medium text-slate-100">{doc.groupTitle}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {t('menu.from')} {doc.fromMemberName}
                          {doc.amount != null && (
                            <> · {formatPeso(doc.amount, { decimals: 2 })}</>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {doc.confirmed ? t('menu.confirmed') : t('menu.pendingConfirm')}
                        </p>
                        <button
                          type="button"
                          disabled={openingDocId === doc.id}
                          onClick={() => openDocument(doc)}
                          className="mt-2 flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 disabled:opacity-60"
                        >
                          <Eye size={14} />
                          {openingDocId === doc.id ? t('menu.opening') : t('menu.viewReceipt')}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {errorMsg && <p className="text-xs text-red-300">{errorMsg}</p>}
              </div>
            )}

            {panel === 'password' && (
              <form onSubmit={handleChangePassword} className="space-y-3 flex-1 md:flex-none">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-100">{t('menu.changePasswordTitle')}</p>
                  <button
                    type="button"
                    onClick={() => setPanel('menu')}
                    className="text-xs text-slate-400 hover:text-amber-300"
                  >
                    {t('common.back')}
                  </button>
                </div>
                <input
                  type="password"
                  required
                  placeholder={t('menu.currentPasswordPlaceholder')}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg bg-[#0b2034] border border-[#284567] px-3 py-2 text-sm text-slate-100"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder={t('menu.newPasswordPlaceholder')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg bg-[#0b2034] border border-[#284567] px-3 py-2 text-sm text-slate-100"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder={t('menu.repeatNewPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg bg-[#0b2034] border border-[#284567] px-3 py-2 text-sm text-slate-100"
                />
                {errorMsg && <p className="text-xs text-red-300">{errorMsg}</p>}
                {successMsg && <p className="text-xs text-emerald-300">{successMsg}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPanel('menu')}
                    className="flex-1 rounded-lg border border-[#284567] px-3 py-2 text-sm text-slate-300"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-lg bg-amber-400 text-slate-900 px-3 py-2 text-sm font-semibold disabled:opacity-60"
                  >
                    {saving ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;
