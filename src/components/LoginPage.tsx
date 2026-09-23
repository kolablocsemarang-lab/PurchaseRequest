import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Lock, User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { KolaBlocLogo, KolaBlocSymbol, KolaBlocArchPattern } from './KolaBlocLogo';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await login(username, password);
      if (!res.success) {
        setErrorMessage(res.message || 'Gagal masuk. Periksa kembali username dan password Anda.');
      }
    } catch {
      setErrorMessage('Terjadi kendala koneksi sistem. Silakan ulangi sesaat lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (uname: string) => {
    setUsername(uname);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-[#140803] text-[#F7E7DE] flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Decorative Heritage Arch Patterns (Brand Guideline Page 1, 3, 53, 72) */}
      <div className="absolute -top-12 -right-16 w-80 h-96 opacity-20 pointer-events-none">
        <KolaBlocArchPattern strokeColor="#E9C892" opacity={0.35} />
      </div>
      <div className="absolute -bottom-20 -left-20 w-80 h-96 opacity-15 pointer-events-none rotate-180">
        <KolaBlocArchPattern strokeColor="#D06224" opacity={0.3} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Kola Bloc Brand Identity Header */}
        <div className="mb-7 text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#220D05] border border-[#AF431D]/40 text-[#D06224] mb-3.5 shadow-xl shadow-black/40">
            <KolaBlocSymbol size={36} fill="#D06224" />
          </div>

          <div className="flex justify-center mb-1">
            <KolaBlocLogo color="sunset" size={30} />
          </div>

          <p className="text-xs text-[#E9C892] font-semibold tracking-wider uppercase mt-1">
            PT KOTA LAMA BERSAMA
          </p>
          <p className="text-[11px] text-[#A67C68] mt-0.5 font-medium">
            Internal Corporate Procurement & Finance Portal
          </p>

          <div className="flex items-center justify-center gap-2 text-[10px] text-[#8C604D] mt-2 font-mono">
            <span>Kota Lama Semarang</span>
            <span>·</span>
            <span className="text-[#D06224] font-semibold">Heritage in Motion</span>
          </div>
        </div>

        {/* Authentication Card */}
        <div className="bg-[#1D0C05] border border-[#3E1E10] rounded-2xl p-7 shadow-2xl relative backdrop-blur-sm">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#32170B]">
            <div>
              <h2 className="text-sm font-bold text-[#F7E7DE] tracking-tight">Autentikasi Staf</h2>
              <p className="text-xs text-[#A67C68] mt-0.5">Masuk untuk akses pengajuan belanja & kas</p>
            </div>
            <div className="text-[10px] text-[#E9C892] font-mono flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#2D1409] border border-[#AF431D]/30">
              <ShieldCheck className="w-3 h-3 text-[#D06224]" />
              <span>RBAC SECURED</span>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-[#3A1009] border border-[#8B3518] text-[#F7D2CC] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#E06450] mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#E9C892] mb-1.5">
                Username Akun
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8C604D]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="misal: andi.marketing atau rudi.liem"
                  autoComplete="username"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-[#140803] border border-[#3E1E10] focus:border-[#D06224] rounded-xl text-[#F7E7DE] text-xs placeholder-[#734A38] focus:outline-none focus:ring-1 focus:ring-[#D06224] transition font-sans"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-[#E9C892]">
                  Kata Sandi
                </label>
                <span className="text-[10px] text-[#8C604D] font-mono">Default: password123</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8C604D]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-[#140803] border border-[#3E1E10] focus:border-[#D06224] rounded-xl text-[#F7E7DE] text-xs placeholder-[#734A38] focus:outline-none focus:ring-1 focus:ring-[#D06224] transition font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-3 py-2.5 px-4 bg-[#D06224] hover:bg-[#B7521B] active:bg-[#AF431D] text-white font-bold text-xs rounded-xl transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-[#D06224]/20"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Kola Bloc Platform</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Persona Selector for Testing & Evaluation */}
          <div className="mt-6 pt-5 border-t border-[#32170B]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold text-[#E9C892] uppercase tracking-wider font-mono">
                Preset Akun Demo (Uji Otorisasi RBAC)
              </span>
              <span className="text-[10px] text-[#8C604D] font-mono">1-Klik Isi</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('andi.marketing')}
                className="p-2 text-left bg-[#140803] hover:bg-[#281107] border border-[#32170B] hover:border-[#AF431D]/50 rounded-xl transition cursor-pointer"
              >
                <div className="font-semibold text-[#F7E7DE] text-[11px]">Andi · Requester</div>
                <div className="text-[10px] text-[#A67C68] font-mono">Marketing & Sales</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('checker01')}
                className="p-2 text-left bg-[#140803] hover:bg-[#281107] border border-[#32170B] hover:border-[#AF431D]/50 rounded-xl transition cursor-pointer"
              >
                <div className="font-semibold text-[#F7E7DE] text-[11px]">Budi · Checker</div>
                <div className="text-[10px] text-[#A67C68] font-mono">Dept Reviewer</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('rudi.liem')}
                className="p-2 text-left bg-[#140803] hover:bg-[#281107] border border-[#32170B] hover:border-[#AF431D]/50 rounded-xl transition cursor-pointer"
              >
                <div className="font-semibold text-[#F7E7DE] text-[11px]">Ir. Rudi · Approver</div>
                <div className="text-[10px] text-[#A67C68] font-mono">Direktur Utama</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('finance01')}
                className="p-2 text-left bg-[#140803] hover:bg-[#281107] border border-[#32170B] hover:border-[#AF431D]/50 rounded-xl transition cursor-pointer"
              >
                <div className="font-semibold text-[#F7E7DE] text-[11px]">Siti · Finance</div>
                <div className="text-[10px] text-[#A67C68] font-mono">Treasury & Transfer</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="p-2 text-left bg-[#140803] hover:bg-[#281107] border border-[#32170B] hover:border-[#AF431D]/50 rounded-xl transition cursor-pointer"
              >
                <div className="font-semibold text-[#F7E7DE] text-[11px]">Dewi · Admin</div>
                <div className="text-[10px] text-[#A67C68] font-mono">Master & Accounts</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('superadmin')}
                className="p-2 text-left bg-[#140803] hover:bg-[#281107] border border-[#32170B] hover:border-[#AF431D]/50 rounded-xl transition cursor-pointer"
              >
                <div className="font-semibold text-[#F7E7DE] text-[11px]">Bambang · Super Admin</div>
                <div className="text-[10px] text-[#A67C68] font-mono">Full System Access</div>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-[#8C604D] font-mono">
          &copy; 2026 KOLA BLOC · PT Kota Lama Bersama · Semarang
        </div>
      </div>
    </div>
  );
};


