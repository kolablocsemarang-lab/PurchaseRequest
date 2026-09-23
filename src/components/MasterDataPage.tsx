import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  DepartmentMaster,
  DirectorMaster,
  CategoryMaster,
  UnitMaster,
  RecipientMaster,
} from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { CreditCard, Tag, Building, UserCheck, Scale, Plus, Edit2, CheckCircle2, XCircle } from 'lucide-react';
import { logActivity } from '../lib/requestService';

interface MasterDataPageProps {
  type: 'recipients' | 'categories' | 'departments' | 'directors' | 'units';
  recipients: RecipientMaster[];
  categories: CategoryMaster[];
  departments: DepartmentMaster[];
  directors: DirectorMaster[];
  units: UnitMaster[];
  onRefresh: () => void;
}

export const MasterDataPage: React.FC<MasterDataPageProps> = ({
  type,
  recipients,
  categories,
  departments,
  directors,
  units,
  onRefresh,
}) => {
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Generic form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [bankName, setBankName] = useState('BCA (Bank Central Asia)');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');

  if (!currentUser) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = `${type}-${Date.now()}`;
      if (type === 'recipients') {
        const item: RecipientMaster = {
          id,
          name: name.trim(),
          bankName,
          bankAccountNumber: bankAccountNumber.trim(),
          bankAccountHolder: bankAccountHolder.trim(),
          phone: phone.trim(),
          email: '',
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'recipients', id), item);
      } else if (type === 'categories') {
        const item: CategoryMaster = {
          id,
          name: name.trim(),
          code: code.trim().toUpperCase() || 'CAT',
          order: categories.length + 1,
          isActive: true,
        };
        await setDoc(doc(db, 'categories', id), item);
      } else if (type === 'departments') {
        const item: DepartmentMaster = {
          id,
          code: code.trim().toUpperCase() || 'DEPT',
          name: name.trim(),
          isActive: true,
        };
        await setDoc(doc(db, 'departments', id), item);
      } else if (type === 'directors') {
        const item: DirectorMaster = {
          id,
          name: name.trim(),
          title: title.trim() || 'Direktur',
          isActive: true,
        };
        await setDoc(doc(db, 'directors', id), item);
      } else if (type === 'units') {
        const item: UnitMaster = {
          id,
          name: name.trim(),
          isActive: true,
        };
        await setDoc(doc(db, 'units', id), item);
      }

      await logActivity(currentUser, `Menambah Master Data: ${type} - ${name}`);
      setIsModalOpen(false);
      setName('');
      setCode('');
      setBankAccountNumber('');
      setBankAccountHolder('');
      onRefresh();
    } catch (err: any) {
      alert('Gagal menyimpan master data: ' + err.message);
    }
  };

  const titlesMap = {
    recipients: 'Penerima & Rekening Pembayaran',
    categories: 'Kategori Pengajuan Permintaan',
    departments: 'Departemen Perusahaan',
    directors: 'Direksi Penyetuju',
    units: 'Daftar Satuan Ukur (Unit)',
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#F7E7DE] tracking-tight">
              Master Data: {titlesMap[type]}
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#281107] text-[#E9C892] font-mono border border-[#4A2413]">
              DATABASE
            </span>
          </div>
          <p className="text-xs text-[#A67C68] mt-1 font-mono">
            Konfigurasi referensi sistem untuk standardisasi dokumen · Kola Bloc · PT Kota Lama Bersama
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D06224] hover:bg-[#B7521B] active:bg-[#AF431D] text-white text-xs font-bold shadow-lg shadow-[#D06224]/20 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Data</span>
        </button>
      </div>

      {/* Table view */}
      <div className="bg-[#180B05] border border-[#3E1E10] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          {type === 'recipients' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#140803] text-[#A67C68] border-b border-[#32170B] font-mono">
                <tr>
                  <th className="p-3.5">Vendor / Penerima</th>
                  <th className="p-3.5">Bank Tujuan</th>
                  <th className="p-3.5">Nomor Rekening</th>
                  <th className="p-3.5">Atas Nama</th>
                  <th className="p-3.5">Telepon</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D1409] text-[#D4BCB0]">
                {recipients.map((r) => (
                  <tr key={r.id} className="hover:bg-[#281107] transition">
                    <td className="p-3.5 font-semibold text-[#F7E7DE]">{r.name}</td>
                    <td className="p-3.5 text-[#D4BCB0]">{r.bankName}</td>
                    <td className="p-3.5 font-mono text-[#D06224] font-bold tabular-nums">{r.bankAccountNumber}</td>
                    <td className="p-3.5 text-[#D4BCB0]">{r.bankAccountHolder}</td>
                    <td className="p-3.5 text-[#A67C68] font-mono text-[11px]">{r.phone || '-'}</td>
                    <td className="p-3.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#2A3111] text-[#A5A041] border border-[#8B8635]/60">
                        AKTIF
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {type === 'categories' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#140803] text-[#A67C68] border-b border-[#32170B] font-mono">
                <tr>
                  <th className="p-3.5 w-16 text-center">Urutan</th>
                  <th className="p-3.5">Kode</th>
                  <th className="p-3.5">Nama Kategori Pengajuan</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D1409] text-[#D4BCB0]">
                {categories.map((c, i) => (
                  <tr key={c.id} className="hover:bg-[#281107] transition">
                    <td className="p-3.5 text-center text-[#8C604D] font-mono">{i + 1}</td>
                    <td className="p-3.5 font-mono text-[#D06224] font-bold">{c.code}</td>
                    <td className="p-3.5 font-semibold text-[#F7E7DE]">{c.name}</td>
                    <td className="p-3.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#2A3111] text-[#A5A041] border border-[#8B8635]/60">
                        AKTIF
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {type === 'departments' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#140803] text-[#A67C68] border-b border-[#32170B] font-mono">
                <tr>
                  <th className="p-3.5">Kode</th>
                  <th className="p-3.5">Nama Departemen</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D1409] text-[#D4BCB0]">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-[#281107] transition">
                    <td className="p-3.5 font-mono text-[#D06224] font-bold">{d.code}</td>
                    <td className="p-3.5 font-semibold text-[#F7E7DE]">{d.name}</td>
                    <td className="p-3.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#2A3111] text-[#A5A041] border border-[#8B8635]/60">
                        AKTIF
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {type === 'directors' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#140803] text-[#A67C68] border-b border-[#32170B] font-mono">
                <tr>
                  <th className="p-3.5">Nama Lengkap Direksi</th>
                  <th className="p-3.5">Jabatan Resmi</th>
                  <th className="p-3.5 text-center">Status Otorisasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D1409] text-[#D4BCB0]">
                {directors.map((d) => (
                  <tr key={d.id} className="hover:bg-[#281107] transition">
                    <td className="p-3.5 font-semibold text-[#F7E7DE]">{d.name}</td>
                    <td className="p-3.5 text-[#D4BCB0]">{d.title}</td>
                    <td className="p-3.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#3A2209] text-[#E9C892] border border-[#AF431D]/60">
                        APPROVER AKTIF
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {type === 'units' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#140803] text-[#A67C68] border-b border-[#32170B] font-mono">
                <tr>
                  <th className="p-3.5">Nama Satuan (Unit)</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D1409] text-[#D4BCB0]">
                {units.map((u) => (
                  <tr key={u.id} className="hover:bg-[#281107] transition">
                    <td className="p-3.5 font-semibold text-[#F7E7DE] font-mono">{u.name}</td>
                    <td className="p-3.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#2A3111] text-[#A5A041] border border-[#8B8635]/60">
                        AKTIF
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Add */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#1D0C05] border border-[#3E1E10] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#E9C892] uppercase tracking-wider font-mono">
              Tambah Master Data: {titlesMap[type]}
            </h3>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Nama / Deskripsi *</label>
                <input
                  type="text"
                  required
                  placeholder="Ketik nama..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] placeholder-[#8C604D] focus:outline-none focus:border-[#D06224]"
                />
              </div>

              {(type === 'categories' || type === 'departments') && (
                <div>
                  <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Kode Singkatan</label>
                  <input
                    type="text"
                    placeholder="misal: MKT, IT, PB"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] placeholder-[#8C604D] uppercase font-mono focus:outline-none focus:border-[#D06224]"
                  />
                </div>
              )}

              {type === 'directors' && (
                <div>
                  <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Jabatan Resmi</label>
                  <input
                    type="text"
                    placeholder="misal: Direktur Utama"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] placeholder-[#8C604D] focus:outline-none focus:border-[#D06224]"
                  />
                </div>
              )}

              {type === 'recipients' && (
                <>
                  <div>
                    <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Nama Bank</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] placeholder-[#8C604D] focus:outline-none focus:border-[#D06224]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Nomor Rekening *</label>
                    <input
                      type="text"
                      required
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] placeholder-[#8C604D] font-mono focus:outline-none focus:border-[#D06224]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Atas Nama Rekening *</label>
                    <input
                      type="text"
                      required
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] placeholder-[#8C604D] focus:outline-none focus:border-[#D06224]"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2D1409]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#3E1E10] text-[#D4BCB0] text-xs hover:bg-[#281107] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#D06224] hover:bg-[#B7521B] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                >
                  Simpan Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
