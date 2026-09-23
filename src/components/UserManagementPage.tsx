import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { UserAccount, UserRole, UserStatus } from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { hashPassword, formatDateIndo, formatDateTimeIndo } from '../lib/utils';
import { logActivity } from '../lib/requestService';
import { assertActiveUser } from '../lib/serverBusinessLogic';
import {
  Users,
  UserPlus,
  Edit2,
  Lock,
  Unlock,
  Slash,
  CheckCircle2,
  KeyRound,
  Shield,
  Search,
} from 'lucide-react';

interface UserManagementPageProps {
  users: UserAccount[];
  onRefresh: () => void;
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({ users, onRefresh }) => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('password123');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('Marketing & Sales');
  const [role, setRole] = useState<UserRole>('REQUESTER');
  const [status, setStatus] = useState<UserStatus>('ACTIVE');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentUser) return null;

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFullName('');
    setUsername('');
    setTemporaryPassword('password123');
    setEmail('');
    setPhone('');
    setJobTitle('');
    setDepartment('Marketing & Sales');
    setRole('REQUESTER');
    setStatus('ACTIVE');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setUsername(user.username);
    setTemporaryPassword('');
    setEmail(user.email);
    setPhone(user.phone);
    setJobTitle(user.jobTitle);
    setDepartment(user.department);
    setRole(user.role);
    setStatus(user.status);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      // Security Check 4 & 10: Server-side validation of active status & admin privileges
      await assertActiveUser(currentUser);

      if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN') {
        throw new Error('AUTHORIZATION_ERROR: Hanya SUPER_ADMIN atau ADMIN yang berhak mengelola akun pengguna.');
      }

      // Security Check 3: Only SUPER_ADMIN can create or promote other SUPER_ADMIN accounts
      if (role === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
        throw new Error('AUTHORIZATION_ERROR: Hanya Super Admin yang berhak memberikan hak akses Super Admin.');
      }

      const cleanUsername = username.trim().toLowerCase();
      if (!cleanUsername) {
        setErrorMessage('Username wajib diisi.');
        setIsSubmitting(false);
        return;
      }

      const now = new Date().toISOString();

      if (editingUser) {
        // Prevent non-superadmins from editing superadmin accounts
        if (editingUser.role === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
          throw new Error('AUTHORIZATION_ERROR: Anda tidak berwenang mengubah akun Super Admin.');
        }

        // Update user
        const updateFields: any = {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          jobTitle: jobTitle.trim(),
          department,
          role,
          status,
          updatedAt: now,
        };

        if (temporaryPassword.trim()) {
          updateFields.passwordHash = await hashPassword(temporaryPassword.trim());
        }

        await updateDoc(doc(db, 'users', editingUser.id), updateFields);

        await logActivity(currentUser, `Memperbarui Data Pengguna: ${editingUser.username}`, {
          oldValue: editingUser.status,
          newValue: status,
          comment: `Role: ${role}, Dept: ${department}`,
        });
      } else {
        // Create new user
        const existing = users.find((u) => u.username.toLowerCase() === cleanUsername);
        if (existing) {
          setErrorMessage('Username sudah digunakan oleh pegawai lain.');
          setIsSubmitting(false);
          return;
        }

        const newId = `usr-${Date.now()}`;
        const pwdHash = await hashPassword(temporaryPassword || 'password123');

        const newUser: UserAccount = {
          id: newId,
          username: cleanUsername,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          jobTitle: jobTitle.trim(),
          department,
          role,
          status,
          passwordHash: pwdHash,
          failedAttempts: 0,
          createdAt: now,
        };

        await setDoc(doc(db, 'users', newId), newUser);

        await logActivity(currentUser, `Membuat Pengguna Baru: ${cleanUsername}`, {
          newValue: role,
          comment: `Nama: ${fullName.trim()}, Dept: ${department}`,
        });
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMessage('Gagal menyimpan data pengguna: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (targetUser: UserAccount, newStatus: UserStatus) => {
    try {
      await assertActiveUser(currentUser);

      if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN') {
        throw new Error('AUTHORIZATION_ERROR: Akses ditolak.');
      }

      if (targetUser.role === 'SUPER_ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
        throw new Error('AUTHORIZATION_ERROR: Hanya Super Admin yang berhak mengubah status akun Super Admin.');
      }

      await updateDoc(doc(db, 'users', targetUser.id), {
        status: newStatus,
        failedAttempts: newStatus === 'ACTIVE' ? 0 : targetUser.failedAttempts,
      });

      await logActivity(currentUser, `Mengubah Status Pengguna: ${targetUser.username} → ${newStatus}`, {
        oldValue: targetUser.status,
        newValue: newStatus,
      });

      onRefresh();
    } catch (err: any) {
      alert('Gagal memperbarui status: ' + err.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#F7E7DE] tracking-tight">
              Manajemen Pengguna & Hak Akses
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#281107] text-[#E9C892] font-mono border border-[#4A2413]">
              RBAC
            </span>
          </div>
          <p className="text-xs text-[#A67C68] mt-1 font-mono">
            User Accounts & Role-Based Access Control · Kola Bloc · PT Kota Lama Bersama
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D06224] hover:bg-[#B7521B] active:bg-[#AF431D] text-white text-xs font-bold shadow-lg shadow-[#D06224]/20 transition cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-[#180B05] border border-[#3E1E10] p-2.5 rounded-xl flex items-center gap-2.5 max-w-md shadow-sm">
        <Search className="w-3.5 h-3.5 text-[#8C604D] shrink-0 ml-1" />
        <input
          type="text"
          placeholder="Cari nama pegawai, username, departemen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs text-[#F7E7DE] placeholder-[#8C604D] focus:outline-none"
        />
      </div>

      {/* Users Table */}
      <div className="bg-[#180B05] border border-[#3E1E10] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#140803] text-[#A67C68] border-b border-[#32170B] font-mono">
              <tr>
                <th className="p-3.5">Pegawai</th>
                <th className="p-3.5">Username</th>
                <th className="p-3.5">Jabatan</th>
                <th className="p-3.5">Departemen</th>
                <th className="p-3.5 text-center">Peran</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Login Terakhir</th>
                <th className="p-3.5 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D1409] text-[#D4BCB0]">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[#281107] transition">
                  <td className="p-3.5 font-medium text-[#F7E7DE] flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#220D05] border border-[#AF431D]/40 flex items-center justify-center text-xs text-[#D06224] font-mono font-bold shrink-0">
                      {u.fullName.charAt(0)}
                    </div>
                    <span className="font-semibold">{u.fullName}</span>
                  </td>
                  <td className="p-3.5 font-mono text-[#D06224]">{u.username}</td>
                  <td className="p-3.5 text-[#D4BCB0]">{u.jobTitle}</td>
                  <td className="p-3.5 text-[#A67C68] font-mono">{u.department}</td>
                  <td className="p-3.5 text-center">
                    <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#281107] text-[#E9C892] border border-[#4A2413]">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        u.status === 'ACTIVE'
                          ? 'bg-[#2A3111] text-[#A5A041] border-[#8B8635]/60'
                          : u.status === 'LOCKED'
                          ? 'bg-[#3A1009] text-[#E06450] border-[#8B3518]'
                          : u.status === 'SUSPENDED'
                          ? 'bg-[#3A2209] text-[#E9C892] border-[#AF431D]/60'
                          : 'bg-[#1D0C05] text-[#8C604D] border-[#3E1E10]'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-[#8C604D] font-mono text-[11px] whitespace-nowrap">
                    {formatDateTimeIndo(u.lastLoginAt)}
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        title="Edit Data User"
                        className="p-1.5 rounded-lg hover:bg-[#281107] text-[#A67C68] hover:text-[#F7E7DE] transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {u.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleQuickStatusChange(u, 'SUSPENDED')}
                          title="Tangguhkan Akun (Suspend)"
                          className="p-1.5 rounded-lg hover:bg-[#3A2209] text-[#A67C68] hover:text-[#E9C892] transition cursor-pointer"
                        >
                          <Slash className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleQuickStatusChange(u, 'ACTIVE')}
                          title="Aktifkan Kembali Akun"
                          className="p-1.5 rounded-lg hover:bg-[#2A3111] text-[#A67C68] hover:text-[#A5A041] transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {u.status === 'LOCKED' && (
                        <button
                          onClick={() => handleQuickStatusChange(u, 'ACTIVE')}
                          title="Buka Kunci Akun (Unlock)"
                          className="p-1.5 rounded-lg hover:bg-[#3A1009] text-[#A67C68] hover:text-[#E06450] transition cursor-pointer"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#1D0C05] border border-[#3E1E10] rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-[#E9C892] uppercase tracking-wider flex items-center gap-2 font-mono">
              <Shield className="w-4 h-4 text-[#D06224]" />
              <span>{editingUser ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}</span>
            </h3>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-[#3A1009] border border-[#8B3518] text-[#E06450] text-xs font-mono">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Nama Lengkap Pegawai *</label>
                  <input
                    type="text"
                    required
                    placeholder="misal: Andi Kusuma, S.I.Kom"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] placeholder-[#8C604D] focus:outline-none focus:border-[#D06224]"
                  />
                </div>
                <div>
                  <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Username Login *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    placeholder="misal: andi.marketing"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] placeholder-[#8C604D] disabled:opacity-50 font-mono focus:outline-none focus:border-[#D06224]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">
                    {editingUser ? 'Reset Password (opsional)' : 'Password Sementara *'}
                  </label>
                  <input
                    type="text"
                    placeholder="Password login..."
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] placeholder-[#8C604D] font-mono focus:outline-none focus:border-[#D06224]"
                  />
                </div>
                <div>
                  <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Email Perusahaan</label>
                  <input
                    type="email"
                    placeholder="andi@kotalamabersama.co.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] placeholder-[#8C604D] focus:outline-none focus:border-[#D06224]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Nomor HP / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="08123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] placeholder-[#8C604D] font-mono focus:outline-none focus:border-[#D06224]"
                  />
                </div>
                <div>
                  <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Jabatan Struktural</label>
                  <input
                    type="text"
                    placeholder="misal: Marketing Specialist"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] placeholder-[#8C604D] focus:outline-none focus:border-[#D06224]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Departemen</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] cursor-pointer focus:outline-none focus:border-[#D06224]"
                  >
                    <option value="Marketing & Sales">Marketing & Sales</option>
                    <option value="Operasional & Properti">Operasional & Properti</option>
                    <option value="Finance & Accounting">Finance & Accounting</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Human Resources & GA">Human Resources & GA</option>
                    <option value="Maintenance & Facility">Maintenance & Facility</option>
                    <option value="Executive Management">Executive Management</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Peran (Role) *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] cursor-pointer font-mono focus:outline-none focus:border-[#D06224]"
                  >
                    <option value="REQUESTER">REQUESTER</option>
                    <option value="CHECKER">CHECKER</option>
                    <option value="APPROVER">APPROVER</option>
                    <option value="FINANCE">FINANCE</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Status Akun</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as UserStatus)}
                    className="w-full px-2.5 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] cursor-pointer font-mono focus:outline-none focus:border-[#D06224]"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING_ACTIVATION">PENDING_ACTIVATION</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="LOCKED">LOCKED</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#2D1409]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#3E1E10] text-[#D4BCB0] text-xs hover:bg-[#281107] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#D06224] hover:bg-[#B7521B] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Pegawai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
