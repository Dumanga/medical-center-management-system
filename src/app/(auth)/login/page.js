import LoginForm from '@/components/login-form';

export const metadata = {
  title: 'Admin Login | Medical Center Management System',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white/80 p-8 shadow-xl backdrop-blur">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-500">Consulting Center</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-600">Enter your credentials to access the admin panel.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
