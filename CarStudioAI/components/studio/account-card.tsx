import { LogIn } from "lucide-react";

type UserPreview = {
  email: string;
};

type AccountCardProps = {
  user: UserPreview | null;
  emailForMagicLink: string;
  authNotice: string | null;
  onMagicLinkEmailChange: (value: string) => void;
  onSignInWithGoogle: () => void;
  onSignInWithEmail: () => void;
  onSignOut: () => void;
};

export function AccountCard({
  user,
  emailForMagicLink,
  authNotice,
  onMagicLinkEmailChange,
  onSignInWithGoogle,
  onSignInWithEmail,
  onSignOut,
}: AccountCardProps) {
  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600">00</span>
        Conta
      </h2>

      <div className="space-y-3">
        {user ? (
          <>
            <p className="text-sm text-gray-700">
              Logado como <span className="font-semibold">{user.email}</span>
            </p>
            <button
              onClick={onSignOut}
              className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold hover:bg-gray-50"
            >
              Sair
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onSignInWithGoogle}
              className="w-full rounded-xl bg-black text-white py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" /> Entrar com Google
            </button>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailForMagicLink}
                onChange={(e) => onMagicLinkEmailChange(e.target.value)}
                placeholder="seu@email.com"
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
              />
              <button
                onClick={onSignInWithEmail}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Email
              </button>
            </div>
          </>
        )}
        {authNotice ? <p className="text-xs text-gray-500">{authNotice}</p> : null}
      </div>
    </section>
  );
}
