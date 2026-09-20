import React, { useState } from 'react';
import { Input, Button } from '@heroui/react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginWithPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('Prosím vyplňte email a heslo.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Heslo musí mať aspoň 6 znakov.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithPassword(email.trim(), password);
      if (!result.success) {
        setErrorMsg(
          result.error === 'Invalid login credentials'
            ? 'Nesprávny email alebo heslo.'
            : result.error || 'Prihlásenie zlyhalo.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Header Logo */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-xl p-2 mb-2 border border-slate-200/80">
            <img src="/favicon.svg" alt="RESR" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            RESR, s.r.o.
          </h1>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/20 space-y-5">
          <div className="text-left space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Prihlásenie</h2>
            <p className="text-xs text-slate-500">Zadajte svoje prihlasovacie údaje pre vstup do systému</p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Emailová adresa <span className="text-rose-500">*</span>
              </label>
              <Input
                type="email"
                size="sm"
                variant="bordered"
                placeholder="admin@resr.sk"
                isRequired
                value={email}
                onChange={e => setEmail(e.target.value)}
                startContent={<Mail className="w-4 h-4 text-slate-400" />}
                classNames={{
                  inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-10 shadow-2xs',
                  input: 'text-xs text-slate-900 placeholder:text-slate-400',
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Heslo <span className="text-rose-500">*</span>
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                size="sm"
                variant="bordered"
                placeholder="••••••••"
                isRequired
                value={password}
                onChange={e => setPassword(e.target.value)}
                startContent={<Lock className="w-4 h-4 text-slate-400" />}
                endContent={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    title={showPassword ? 'Skryť heslo' : 'Zobraziť heslo'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                classNames={{
                  inputWrapper: 'border-slate-300 bg-white hover:border-slate-400 focus-within:!border-slate-900 rounded-lg h-10 shadow-2xs',
                  input: 'text-xs text-slate-900 placeholder:text-slate-400',
                }}
              />
            </div>

            <Button
              type="submit"
              isLoading={loading}
              className="w-full bg-slate-950 hover:bg-slate-850 text-white font-bold text-xs h-10 rounded-xl shadow-md transition mt-2 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Prihlásiť sa do systému</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
