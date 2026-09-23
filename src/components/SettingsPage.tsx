import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { CompanySettings } from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { logActivity } from '../lib/requestService';
import { Settings, Save, Building, ShieldCheck, Check } from 'lucide-react';

interface SettingsPageProps {
  companySettings: CompanySettings;
  onRefresh: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ companySettings, onRefresh }) => {
  const { currentUser } = useAuth();

  const [companyName, setCompanyName] = useState(companySettings.companyName);
  const [address, setAddress] = useState(companySettings.address);
  const [phone, setPhone] = useState(companySettings.phone);
  const [email, setEmail] = useState(companySettings.email);
  const [logoUrl, setLogoUrl] = useState(companySettings.logoUrl);
  const [documentFooter, setDocumentFooter] = useState(companySettings.documentFooter);
  const [prNumberFormat, setPrNumberFormat] = useState(companySettings.prNumberFormat);
  const [maxAttempts, setMaxAttempts] = useState(companySettings.maxFailedLoginAttempts || 5);
  const [taxPercent, setTaxPercent] = useState(companySettings.taxPercentageDefault || 11);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!currentUser) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const updated: CompanySettings = {
        id: 'company',
        companyName: companyName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        logoUrl: logoUrl.trim(),
        documentFooter: documentFooter.trim(),
        prNumberFormat: prNumberFormat.trim(),
        maxFailedLoginAttempts: Number(maxAttempts) || 5,
        taxPercentageDefault: Number(taxPercent) || 11,
      };

      await setDoc(doc(db, 'settings', 'company'), updated);

      await logActivity(currentUser, 'Memperbarui Pengaturan Perusahaan & PDF Template', {
        comment: `Format PR: ${prNumberFormat}`,
      });

      setSavedSuccess(true);
      onRefresh();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert('Gagal menyimpan pengaturan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 font-sans">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#F7E7DE] tracking-tight flex items-center gap-2">
            <span>Pengaturan Perusahaan & Dokumen</span>
          </h1>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#281107] text-[#E9C892] font-mono border border-[#4A2413]">
            SYSTEM
          </span>
        </div>
        <p className="text-xs text-[#A67C68] mt-1 font-mono">
          Identitas Badan Usaha, Format Dokumen PDF, & Kebijakan Keamanan · Kola Bloc · PT Kota Lama Bersama
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-[#2A3111] border border-[#8B8635]/60 text-[#E9C892] text-xs flex items-center gap-2 font-mono shadow-md animate-in fade-in">
          <Check className="w-4 h-4 text-[#A5A041] shrink-0" />
          <span>Pengaturan berhasil disimpan dan diperbarui di seluruh sistem.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-[#180B05] border border-[#3E1E10] rounded-2xl p-6 shadow-2xl space-y-6 text-xs">
        <div>
          <h3 className="text-xs font-bold text-[#E9C892] uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
            <Building className="w-4 h-4 text-[#D06224]" />
            <span>1. Identitas Badan Usaha (Kop Surat Resmi)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Nama Perusahaan *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] font-semibold focus:outline-none focus:border-[#D06224]"
              />
            </div>

            <div>
              <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Nomor Telepon Kantor</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] font-mono focus:outline-none focus:border-[#D06224]"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Alamat Kantor Pusat</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] focus:outline-none focus:border-[#D06224]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Email Resmi Perusahaan</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] focus:outline-none focus:border-[#D06224]"
              />
            </div>

            <div>
              <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">URL Logo Perusahaan (Kop Surat)</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full px-3 py-2 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] font-mono focus:outline-none focus:border-[#D06224]"
              />
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-[#2D1409]">
          <h3 className="text-xs font-bold text-[#E9C892] uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#D06224]" />
            <span>2. Format Penomoran & Standar Dokumen PR</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Format Nomor PR</label>
              <input
                type="text"
                value={prNumberFormat}
                onChange={(e) => setPrNumberFormat(e.target.value)}
                className="w-full px-3 py-2 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#D06224] font-mono font-bold focus:outline-none focus:border-[#D06224]"
              />
              <p className="text-[10px] text-[#8C604D] mt-1 font-mono">
                Contoh: PR/KLB/&#123;YYYY&#125;/&#123;MM&#125;/&#123;XXXX&#125;
              </p>
            </div>

            <div>
              <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Tarif Default PPN (%)</label>
              <input
                type="number"
                value={taxPercent}
                onChange={(e) => setTaxPercent(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] font-mono tabular-nums focus:outline-none focus:border-[#D06224]"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Catatan Kaki Dokumen Resmi (Footer)</label>
            <textarea
              rows={2}
              value={documentFooter}
              onChange={(e) => setDocumentFooter(e.target.value)}
              className="w-full px-3 py-2 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] focus:outline-none focus:border-[#D06224]"
            />
          </div>
        </div>

        <div className="pt-5 border-t border-[#2D1409]">
          <h3 className="text-xs font-bold text-[#E9C892] uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#D06224]" />
            <span>3. Kebijakan Keamanan Akun</span>
          </h3>
          <div className="max-w-xs">
            <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">
              Batas Gagal Login Sebelum Terkunci
            </label>
            <input
              type="number"
              min="3"
              max="10"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] font-mono tabular-nums focus:outline-none focus:border-[#D06224]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[#2D1409] flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D06224] hover:bg-[#B7521B] active:bg-[#AF431D] text-white text-xs font-bold shadow-lg shadow-[#D06224]/20 transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
